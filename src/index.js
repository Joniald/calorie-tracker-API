const express = require("express");
const mongoose = require('mongoose');

const usersRouter = require("./routers/users");
const tasksRouter = require("./routers/tasks");

const app = express();
const port = process.env.PORT

// In order to have objects from json files
app.use(express.json());

// Exporting the Router users into the main file
app.use(usersRouter);

// Exporting the Router tasks into the main file
app.use(tasksRouter);

// Connection with mongodb database
const connectionURL = process.env.URL_CONNECTION;
mongoose.connect(connectionURL, {
    useNewUrlParser: true, 
    useCreateIndex: true,
    useFindAndModify: false,
    useUnifiedTopology: true
});

// Lisening on port 3001
app.listen(port,()=>{
    console.log("Server is listen on port " + port)
})

