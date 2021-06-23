const express = require("express");
const router = new express.Router();
const User = require("../models/user");
const auth = require("../middleware/auth");
const multer = require("multer");
const sharp = require("sharp");
const {sendWelcomeEmail,sendConfirmDeletion} = require("../emails/accaunt");





// The Users document CRUD

// Post user
router.post("/users", async (req,res)=>{
    const user = new User(req.body)
    try {
    const userSave = await user.save()
    sendWelcomeEmail(userSave.email, userSave.name)
    const token = await userSave.generateAuthToken()
    res.status(201).send({userSave,token})
    }catch(e){
        if (e.name === 'MongoError' && e.code === 11000) {
              return res.status(400).send({error:'This item already exists, please try again'});
        } 
        if (e.errors.name) {
          return res.status(400).send({error:e.errors.name.message});
        }  
        if (e.errors.password) {
          return res.status(400).send({error:e.errors.password.message});
        }
        if (e.errors.email) {
          return res.status(400).send({error:e.errors.email.message});
        } 
        if (e.errors.age) {
          return res.status(400).send({error:e.errors.age.message});
        } 
        res.status(400).send(e)
    }
})
// Post user login
router.post("/users/login", async (req,res) =>{
    
    try{
          
      const user = await User.findByCredentials(req.body.email, req.body.password)
      const token = await user.generateAuthToken()
      
      res.send({user, token}) 

    } catch(e) {
      res.status(400).send(e)
    }
})
// Post user logout
router.post("/users/logout", auth, async (req, res)=>{
   try {

    req.user.tokens = req.user.tokens.filter((token)=>{
        return token.token !== req.token
    })

    await req.user.save()
    res.send()

   } catch (e) {
     res.status(500).send()
   }
})

// Post users logout all of them
router.post("/users/logoutAll", auth, async (req,res)=>{
    try{

        req.user.tokens = []
        await req.user.save()
        res.send()

    } catch(e) {
        res.status(500).send()
    }
})

// Get only the user who has been authendicated
router.get("/users/me", auth,  async (req,res)=>{
    res.send(req.user)
})

// Update user with id
router.patch("/users/me", auth, async (req,res)=>{
    const updates = Object.keys(req.body);
    const allowedUpdates = ["name", "email", "password", "age"];
    const isValidOperation = updates.every((update)=>{
        return allowedUpdates.includes(update)
    })
    

    if (!isValidOperation) {
        return res.status(400).send({error:"Invalid update"})
    }

    try {
        updates.forEach((update)=>req.user[update] = req.body[update])
        await req.user.save()

      //const userUpdate = await User.findByIdAndUpdate(req.params.id, req.body, {new:true, runValidators:true})
      
      res.send(req.user)
    } catch(e) {
      res.status(400).send(e)
    }
})


// Delete a user when he/she has been authorizated
router.delete("/users/me", auth, async (req,res)=>{
    // try{
    //   const user = await User.findByIdAndDelete(req.params.id)
    //   if (!user) {
    //       return res.status(404).send()
    //   }
    //   res.send(user)
    try{
        await req.user.remove()
        sendConfirmDeletion(req.user.email,req.user.name)
        res.send(req.user)
    } catch(e) {
      res.status(500).send()
    }
})
/////////////////////////UPLOADING IMAGES////////////////////////////////////////////
const upload = multer({
  // the folder images will be stored
  // dest: "images",
  
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
router.post("/users/me/avatar", auth, upload.single("avatar"), async (req,res) =>{
  // converting the image into png and resize it with sharp. Then transform it again toBuffer
   const buffer = await sharp(req.file.buffer).resize({width:250, height:250}).png().toBuffer()
   req.user.avatar = buffer
  //req.user.avatar = req.file.buffer  // we are inserting the image into the database as a buffer
   await req.user.save()
   res.send()
},
//error handling
(error,req,res,next) => {
  res.status(400).send({error: error.message})
}
)
// the router in order to delete an image
router.delete("/users/me/avatar", auth, async (req, res) =>{
     req.user.avatar = undefined
     await req.user.save()
     res.send()
 })
// // geting the image from the user back with his/her id
// router.get("/users/:id/avatar", async (req, res) => {
//   try {
//     const user = await User.findById(req.params.id)
//     if (!user || !user.avatar) {
//       throw new Error()
//     }
//     // Sending headers
//     res.set("Content-Type","image/jpg")
//     res.send(user.avatar)

//   } catch(e) {
//     res.status(404).send()
//   }
// })

// geting the image from the user when he/she is authorized
router.get("/users/me/avatar", auth, async (req, res) => {
  
  try {
    if (!req.user.avatar) {
      throw new Error()
    }
    // Sending headers
    res.set("Content-Type","image/png")
    res.send(req.user.avatar)

  } catch(e) {
    res.status(404).send()
  }
})


module.exports = router
