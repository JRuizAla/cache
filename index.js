const express = require("express");
const redis = require("redis");
const admin = require("firebase-admin");
const credentials = require("./key.json");
const cors = require("cors");

const PORT = process.env.PORT || 8080;
const REDIS_PORT = process.env.REDIS_PORT || 6379;

const client = redis.createClient({
  url: "redis://redis:6379",
});
client.connect();
client.on("connect", () => {
  console.log("connected");
});

const app = express();

admin.initializeApp({
  credential: admin.credential.cert(credentials),
});

const db = admin.firestore();

const whiteList = [
  "https://ntt-crud-jesus.firebaseapp.com",
  "http://localhost:4200",
];

app.use(cors({ origin: whiteList }));

db.collection("cars").onSnapshot((snapshot) => {
  let cars = []
  snapshot.docs.forEach((doc) => {
    cars.push({ ...doc.data(), id: doc.id})
  })
  console.log(cars);
  // Set data to Redis
  client.FLUSHALL();
  client.setEx("cars", 600, JSON.stringify(cars));
});

// Make request to firebase for data
async function getCars(req, res, next) {
  try {
    console.log("Fetching all Data...");
    const carsRef = db.collection("cars");
    const response = await carsRef.get()
    let responseArr = []
    response.forEach((doc) => {
      responseArr.push({...doc.data(), id:doc.id})
    })
    res.send(responseArr);
  } catch (err) {
    console.error(err);
    res.send(err);
  }
}

async function getCarById(req, res, next) {
  try {
    console.log(`Fetching ${req.params.id} Data...`);
    const carsRef = db.collection("cars").doc(req.params.id);
    const response = await carsRef.get();
    res.send(response.data());
    // Set data to Redis
    client.setEx(req.params.id, 600, JSON.stringify(response.data()));
  } catch (err) {
    console.error(err);
    res.send(err);
  }
}

async function updateCache(req, res, next) {
  //await client.FLUSHALL();
  console.log("Cache flushed");
  res.send("Cache flushed");
}

// Cache middleware
async function cacheAllCars(req, res, next) {
  const cachedData = await client.get("cars");
  if (cachedData != null) {
    console.log("cache hit");
    res.send(cachedData);
  } else next();
}

async function cacheCarId(req, res, next) {
  console.log(req.params);
  const cachedData = await client.get(`${req.params.id}`);
  if (cachedData != null) {
    console.log("cache hit");
    res.send(cachedData);
  } else next();
}

//endpoints
app.get("/crud", cacheAllCars, getCars);

app.get("/edit/:id", cacheCarId, getCarById);

app.get("/update", updateCache);

app.listen(8080, () => {
  console.log(`App listening on port ${PORT}`);
});
