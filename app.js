if(process.env.NODE_ENV != "production"){
  require('dotenv').config();
};

console.log(process.env.SECRET);

const express = require("express");
const app = express();
const mongoose = require("mongoose");
const path = require("path");
const bodyParser = require("body-parser");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const ExpressError = require("./utils/ExpressError.js");
const session = require("express-session");
const MongoStore = require('connect-mongo');
const flash = require("connect-flash");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const User = require("./models/user.js");

const listingRouter = require("./routes/listing.js");
const reviewRouter = require("./routes/review.js");
const userRouter = require("./routes/user.js");
const { cloudinary } = require('./cloudConfig.js');


const dbUrl = process.env.ATLASDB_URL;

main()
  .then(() => {
    console.log("connected to DB");
  })
  .catch((err) => {
    console.log(err);
  });

async function main() {
  await mongoose.connect(dbUrl);
}

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.engine("ejs", ejsMate);
app.use(express.static(path.join(__dirname, "/public")));

const store =  MongoStore.create({
  mongoUrl : dbUrl , 
  crypto : {
    secret : process.env.SECRET ,
  },
  touchAfter : 24 * 3600 ,
});

store.on("error" , ()=>{
  console.log("ERROR IN MONGO SESSION STORE" , err);
});

const sessionOptions = {
  store ,
  secret :  process.env.SECRET ,
  resave : false ,
  saveUninitialized : true,
  cookies : {
    expires : Date.now() + 7 * 24 * 60 *60 *1000 ,
    maxAge : 7 * 24 * 60 * 60 * 1000,
    httpOnly : true ,
  },
};

// app.get("/", (req, res) => {
//   res.send("Relax , I m working properly");
// });

app.use(session(sessionOptions));
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));

// use static serialize and deserialize of model for passport session support
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req ,res ,next) =>{
  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");
  res.locals.currUser = req.user;
  next();
});

// app.get("/demouser" , async(req,res)=>{
//   let fakeUser = new User({
//     email : "student@gmail.com",
//     username : "delta-student",
//   });
//   let registerdUser = await User.register(fakeUser , "helloworld");
//   res.send(registerdUser);
// });


app.use("/listings" , listingRouter);
app.use("/listings/:id/reviews" , reviewRouter);
app.use("/" , userRouter);


app.all("*", (req, res, next) => {
  next(new ExpressError(404, "Page not found"));
});

app.use((err, req, res, next) => {
  let { statusCode = 500, message = "something went wrong!" } = err;
  //  res.status(statusCode).send(message);
  res.status(statusCode).render("error.ejs", { message });
});

app.listen(8080, () => {
  console.log("server is listening to port 8080");
});


// link of cloudinary
// https://console.cloudinary.com/console/c-6f5a47b0852cafc204a18698f2b3bc/media_library/folders/c7d2af68c60978417f7adb0ee3b0720d6f?view_mode=mosaic