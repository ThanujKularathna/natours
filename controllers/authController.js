const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const Email = require('../utils/email');
// const { trusted } = require('mongoose');

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const createSendToken = async (user, statusCode, res) => {
  const token = signToken(user._id);
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000,
    ),
    httpOnly: true, //can not e modified by browser or any other way
  };
  //secure is false becuase we are not using https,only e send over the encrypted connection
  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;

  res.cookie('jwt', token, cookieOptions);

  //remove the password from the output
  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user,
    },
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm, //for stopping  user regiter as a admin
    passwordChangeAt: req.body.passwordChangeAt,
  });

  const url = `${req.protocol}://${req.get('host')}/me`;
  await new Email(newUser, url).sendWelcome();

  createSendToken(newUser, 201, res);
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  //1)Check is email and password exist
  if (!email || !password) {
    return next(new AppError('please provide email and password', 400)); //added return because login function should be ended after gettting an error
  }
  //2)check i uer exits && password is correct
  const user = await User.findOne({ email }).select('+password');

  //correct password is instance of user schema //availbale in all document of certain co
  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Incorrect email or password', 401));
  }
  //3)if everything ok,send token to cleint
  createSendToken(user, 200, res);
});

exports.logout = (req, res, next) => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });

  res.status(200).json({
    status: 'success',
  });
};

exports.protect = catchAsync(async (req, res, next) => {
  console.log('working protect');
  // console.log(req.headers.authorization);
  //1)Getting token and check if it's there

  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt) {
    // console.log(req.cookies.jwt);
    token = req.cookies.jwt;
  }

  console.log(token);

  if (!token) {
    return next(new AppError('you are not logged in! please log in', 401));
  }
  //2)Verification token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  //3)check if user still exist //what if user deleted it mean time but token till exist
  const CurrentUser = await User.findById(decoded.id);
  if (!CurrentUser) {
    return next(
      new AppError(
        'The user belonging to this token does no longer exist',
        401,
      ),
    );
  }
  //4)check if user changed passoword after jwd was issued
  if (CurrentUser.changePasswordAfter(decoded.iat)) {
    return next(
      new AppError('user recently changed password! please log in again', 401),
    );
  }

  //GRANT ACCESS TO PROTECTED ROUTE
  req.user = CurrentUser;
  res.locals.user = CurrentUser;
  //adding to request body so this can use in next middle

  next();
});

//only for render pages, no errors
exports.isLoggedIn = async (req, res, next) => {
  if (req.cookies.jwt) {
    try {
      //1)Verification token
      const decoded = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET,
      );

      //2)check if user still exist //what if user deleted it mean time but token till exist
      const CurrentUser = await User.findById(decoded.id);
      if (!CurrentUser) {
        return next();
      }
      //3)check if user changed passoword after jwd was issued
      if (CurrentUser.changePasswordAfter(decoded.iat)) {
        return next();
      }

      //THERE IS A LOGGED IN USER
      res.locals.user = CurrentUser;
      return next();
    } catch (err) {
      return next();
    }
  }
  next();
};

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    //role['admin,'lead-guide]
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permision to perfor thi action', 403),
      );
    }
    next();
  };
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
  //1)Get user based on posted email
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError('There i no user email address', 404));
  }
  //2)Genarate the random reset token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  //3)send email

  try {
    const resetURL = `${req.protocol}://${req.get('host')}/api/v1/users/resetPassword/${resetToken}`;

    await new Email(user, resetURL).sendPasswordReset();
    res.status(200).json({
      status: 'success',
      message: 'Token sent to email',
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(new AppError('there is a error sending email', 500));
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  //1)Get user based on the token
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });
  //2)If token has not expired and there is user,set new password
  if (!user) {
    return next(new AppError('Token is expired or invalid', 400));
  }
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();
  //3)update changePasswordAt property for the user

  //4)log the user in,send JWT
  createSendToken(user, 200, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  //1)get user from the colletion basically
  const user = await User.findById(req.user.id).select('+password');

  //2)check if posted current password is correct
  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    return next(new AppError('Your current password is wrong', 401));
  }

  //3)If o,update password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();

  //4)Log user in,send JWT
  createSendToken(user, 200, res);
});
