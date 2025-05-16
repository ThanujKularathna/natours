const AppError = require('../utils/appError');

const handleCastErrorDB = (err) => {
  const message = `invalid ${err.path}: ${err.value}.`;
  return new AppError(message, 400);
};

const handleDublicateFieldsDB = (err) => {
  console.log(err);
  const value = err.keyValue.name;
  // const value = err.errmsg.match(/(["'])(\\?.)*?\1/);
  const message = `Dublicate field value "${value}" please use another value`;

  return new AppError(message, 400);
};

const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map((el) => el.message);
  const message = `Invalid input data.${errors.join('. ')}`;
  return new AppError(message, 400);
};

const handleJWTError = (err) =>
  new AppError('INVALID TOKEN.please logging again', 401);

const handleJWTExpireError = (err) =>
  new AppError('your token has been expired please log again', 401);

const sendErrorDev = (err, req, res) => {
  console.log(err);
  //A)API
  if (req.originalUrl.startsWith('/api')) {
    return res.status(err.statusCode).json({
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack,
    });
  } 
  
  //B)REDNERED WEBSITE
  return res.status(err.statusCode).render('error', {
    title: 'something went wrong',
    msg: err.message,
  });
  
};

const sendErrorProd = (err, req, res) => {
  //A)API
  if (req.originalUrl.startsWith('/api')) {
    //A)operational,trusted error:send message to client
    if (err.isOperational) {
      return res.status(err.statusCode).json({
        status: err.status,
        message: err.message,
      });
    }

    //programming or other unknown error:do not leak error details
    console.error('ERROR', err);
    return res.status(500).json({
      status: 'error',
      message: err,
    });
  }
  //B) RENDERED WEBSITE
  //A)operational,trusted error:send message to client
  if (err.isOperational) {
    return res.status(err.statusCode).render('error', {
      title: 'something went wrong',
      msg: err.message,
    });

  } 
  //B)programming or other unknown error:don't leak error details
    console.error('ERROR', err);
    return res.status(err.statusCode).render('error', {
      title: 'something went wrong',
      msg: 'Please try again later',
    });
  
};

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, req, res);
  } else if (process.env.NODE_ENV === 'production') {
    let error = { ...err, name: err.name };
    error.message = err.message;
    
    if (error.name === 'CastError') error = handleCastErrorDB(error);
    if (error.code === 11000) error = handleDublicateFieldsDB(error);
    if (error.name === 'ValidationError')
      error = handleValidationErrorDB(error);
    if (error.name === 'JsonWebTokenError') error = handleJWTError(error);
    if (error.name === 'TokenExpireError') error = handleJWTExpireError(error);

    sendErrorProd(error, req, res);
  }
};
