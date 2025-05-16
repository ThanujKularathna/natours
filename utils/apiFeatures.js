class APIFeatures {
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
  }

  filter() {
    // console.log(req.query.sort);
    const queryObj = { ...this.queryString };
    const excludeFields = ['page', 'sort', 'limit', 'fields'];
    excludeFields.forEach((el) => delete queryObj[el]);

    //1B)Advanced filtering
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|gte|lt)\b/g, (match) => `$${match}`);
    this.query = this.query.find(JSON.parse(queryStr));

    return this; //return entire object to sort
  }

  sort() {
    if (this.queryString.sort) {
      // console.log(this.queryString);
      const sortBy = this.queryString.sort.split(',').join(' ');
      this.query = this.query.sort(sortBy);
    } else {
      this.query = this.query.sort('-price');
    }
    return this;
  }

  //get fields what we need
  limitFields() {
    if (this.queryString.fields) {
      console.log(this.queryString.fields.split(','));
      const fields = this.queryString.fields.split(',').join(' '); //join make list as one string
      this.query = this.query.select(fields);
      // console.log(fields);
    } else {
      this.query = this.query.select('-__v');
    }

    return this;
  }

  pagination() {
    const page = this.queryString.page * 1 || 1;
    const limit = this.queryString.limit * 1 || 100;
    const skip = (page - 1) * limit;

    this.query = this.query.skip(skip).limit(limit);

    // if (this.queryString.page) {
    //   const numTours = await Tour.countDocuments();
    //   console.log('number of tourss= ', numTours);
    //   if (skip >= numTours) throw new Error('this page does not exist');
    // }
    return this;
  }
}

module.exports = APIFeatures;
