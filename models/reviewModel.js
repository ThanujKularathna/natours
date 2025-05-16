//review ,rating, createdAt,ref to tour,ref to user
const mongoose = require('mongoose');
const Tour = require('./tourModel');

const reviewSchema = new mongoose.Schema(
  {
    review: {
      type: String,
      required: [true, 'Review can not be empty'],
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    tour: {
      type: mongoose.Schema.ObjectId,
      ref: 'Tour',
      required: [true, 'review must belong to a tour'],
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'review must be belong to a user'],
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

reviewSchema.index({ tour: 1, user: 1 }, { unique: true });

reviewSchema.pre(/^find/, function (next) {
  // this.populate({
  //   path: 'tour',
  //   select: 'name',
  // }).populate({
  //   path: 'user',
  //   select: 'name photo',
  // });

  this.populate({
    path: 'user',
    select: 'name photo',
  });

  next();
});

reviewSchema.statics.calcAverageRatings = async function (tourId) {
  const stats = await this.aggregate([
    {
      $match: { tour: tourId },
    },
    {
      $group: {
        _id: '$tour',
        nRating: { $sum: 1 },
        avgRating: { $avg: '$rating' },
      },
    },
  ]);

  if (stats.length > 0) {
    // console.log(stats);
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: stats[0].nRating,
      ratingsAverage: stats[0].avgRating,
    });
  } else {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: 0,
      ratingsAverage: 4.5,
    });
  }
};

reviewSchema.post('save', function () {
  //no next keyword bcz post mehtod
  //this keyword point to current review
  this.constructor.calcAverageRatings(this.tour); //property =this.tour ,constructor mean current model which means review
});

//findByIdAndUpdate
//findByIdAndDelete
// reviewSchema.pre('findOneAndUpdate', async function (next) {
//   //in here this keyword is refere to current query
//   this.r = await this.findOne().clone(); //findone() find the document and save into the r varible before it's modified
//   console.log(this.r);
//   next();
// });

// reviewSchema.post('findOneAndUpdate', async function () {
//   // await this.findOne().clone();  does NOT work here query has already executed
//   await this.r.constructor.calcAverageRatings(this.r.tour);
//   console.log('running');
// });

//after pre post is not executed I checked that
reviewSchema.pre(/^findOneAnd/, async function (next) {
  //in here this keyword is refere to current query
  this.r = await this.findOne().clone(); //findone() find the document and save into the r varible before it's modified
  console.log(this.r);
  next();
});

reviewSchema.post(/^findOneAnd/, async function () {
  // await this.findOne().clone();  does NOT work here query has already executed
  await this.r.constructor.calcAverageRatings(this.r.tour);
});

reviewSchema.post(/^find/, (docs, next) => {
  console.log(`query took ${Date.now()}`);
  next();
});

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
