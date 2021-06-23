const mongodb = require("mongodb");
const MongoClient = mongodb.MongoClient;
const ObjectID = mongodb.ObjectID;

const connectionURL = process.env.URL_CONNECTION;
const databaseName = "calorie-tracker";

MongoClient.connect(connectionURL, { useNewUrlParser:true }, (error, client)=>{
     if (error) {
         return console.log("Unable to connect");
     }
     console.log("Connected correctly");
})