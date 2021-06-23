const express = require("express");
const router = new express.Router();
const Task = require("../models/task");
const auth = require("../middleware/auth");
const multer = require("multer");
const sharp = require("sharp");

// Post tasks assosiated with the auth user
router.post("/tasks", auth, async (req,res)=>{
    const newTask = new Task({
        ...req.body,
        owner:req.user._id
    });
    try {
        const taskSave = await newTask.save()
        res.status(201).send(taskSave)
    } catch (e) {
        
      if (e.errors.description) {
        return res.status(400).send({error:e.errors.description.message});
      }  
      if (e.errors.mealType) {
        return res.status(400).send({error:e.errors.mealType.message});
      }
      res.status(400).send(e)
    }
})
// Get all tasks
router.get("/tasks", auth, async (req,res)=>{
   // Filtering the comleted tasks
   const match = {}
   if (req.query.meal) {
       match.mealType = req.query.meal 
   }
   // Sorting  GET /tasks?sortBy=createdAt:desc  or asc
   // the comand is sort: {createdAt:1 or -1} or 

   // where asc => 1   desc => -1
   const sort = {}
   if (req.query.sortBy) {
       const parts = req.query.sortBy.split(":")
       sort[parts[0]] = parts[1] === "desc" ? -1 : 1
   }

    try {
        await req.user.populate({
          path:"tasks",
          // Filtering the comleted tasks  GET /tasks?meal=Breakfast or Brunch or Snack or Lunch or Dinner 
          match: match,
          // Pagination limit and skip  GET /tasks?limit=nr&skip=nr
          options: {
              limit: parseInt(req.query.limit),
              skip: parseInt(req.query.skip),
              // Sorting  GET /tasks?sortBy=createdAt:desc  or asc
              sort: sort
          }
        }).execPopulate()
        res.send(req.user.tasks)
      
    } catch (e) {
      res.status(500).send(e)
    }
})
// Get task with id
router.get("/tasks/:id", auth, async (req,res)=>{
    const _id = req.params.id;
    try {
     //const taskFindId = await Task.findById(_id)
     const taskFindId = await Task.findOne({_id, owner:req.user._id})
     if (!taskFindId) {
         return res.status(404).send(taskFindId)
     }
     res.send(taskFindId)
    } catch (e) {
        res.status(500).send(e)
    }
})

router.patch("/tasks/:id", auth, async (req, res)=>{
    const updates = Object.keys(req.body)
    const validUpdate = ["description", "mealType"]
    const isValidUpdate = updates.every((update)=>{
        return validUpdate.includes(update)
    })

    if (!isValidUpdate) {
        return res.status(400).send({error:"Invalid updates!"})
    }

    try{
      //const task = await Task.findById(req.params.id);
      const task = await Task.findOne({_id:req.params.id, owner:req.user._id})

      if (!task) {
        return res.status(404).send({error:"Task not found"})
      }

      updates.forEach((update)=>task[update]=req.body[update])
      await task.save()

      //const taskUpdate = await Task.findByIdAndUpdate(req.params.id, req.body, {runValidators:true, new:true})
      
      res.send(task)
    } catch (e) {
        res.status(400).send(e)
    }
})

// Delete a task
router.delete("/tasks/:id", auth, async (req,res)=>{
    try{
      //const task = await Task.findByIdAndDelete(req.params.id)
      const task = await Task.findOneAndDelete({_id:req.params.id, owner:req.user._id})
      if(!task) {
          return res.status(404).send()
      }
      
      res.send(task)

    } catch (e) {
        res.status(500).send()
    }
})


const upload = multer({
    // upper limit in the size of the file in bites
    limits: {
      fileSize: 3000000
    },
    // this is a multer function for filtering the files regarding their type
    // has a request, the file witch contains all the informations and a callback
    // callback(new Error("something wrong"))   ...using callback if something wrong
    // callback(undefined, true)   ...if everything is ok
    fileFilter(req, file, callback) {
      // we are using regular expression
      if (!file.originalname.match(/\.(jpeg|jpg|png)$/)) {
        return callback(new Error("Files supported .jpeg .jpg .png"))
      }
      
      callback(undefined, true)
   
    }
  });

  // the router in order to upload the image
  router.post("/tasks/image/:id", auth, upload.single("imgFood"), async (req,res) =>{
    try {  
    const _id = req.params.id;
    //const taskFindId = await Task.findById(_id)
    const taskFindId = await Task.findOne({_id, owner:req.user._id})
    if (!taskFindId) {
        throw new Error()
    }
    // converting the image into png and resize it with sharp. Then transform it again toBuffer
    const buffer = await sharp(req.file.buffer).resize({width:250, height:250}).png().toBuffer()
    taskFindId.imageFood = buffer
    //req.user.avatar = req.file.buffer  // we are inserting the image into the database as a buffer
    await taskFindId.save()
    res.send()
    } catch(e) {
        res.status(400).send({error: e.message})
    }
  },(error,req,res,next) => {
    res.status(400).send({error: error.message})
  }
  )

  //the router in order to delete an image
  router.delete("/tasks/image/:id", auth, async (req, res) =>{
      try {
          const _id = req.params.id;
          const taskFindId = await Task.findOne({ _id, owner: req.user._id })
          if (!taskFindId) {
            throw new Error()
          }
          taskFindId.imageFood = undefined
          await taskFindId.save()
          res.send()
      } catch (e) {
          res.status(400).send({ error: e.message })
      }
   })

  // geting the image from the user back with his/her id
  router.get("/tasks/image/:id", auth, async (req, res) => {
    try {
        const _id = req.params.id;
        const taskFindId = await Task.findOne({ _id, owner: req.user._id })
      if (!taskFindId || !taskFindId.imageFood) {
        throw new Error()
      }
      // Sending headers
      res.set("Content-Type","image/jpg")
      res.send(taskFindId.imageFood)
  
    } catch(e) {
      res.status(404).send({ error: e.message })
    }
  })

module.exports = router