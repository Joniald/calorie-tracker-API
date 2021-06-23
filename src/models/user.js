const mongoose = require('mongoose');
const validator = require("validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Task = require("./task");


const userSchema = new mongoose.Schema({
    name: {
        type:String,
        minLength: [3,"The length of the name should be at least 3 characters"],
        trim: true
    },
    password: {
        type:String,
        unique: true, 
        required: true,
        minLength: [6,"The length of the password should be at least 6 characters"],
        trim: true,
        validate(value) {
            if (value.toLowerCase().includes("password")) {
                throw new Error("Don't use the word 'password'")
            }
        }
    },
    email: {
        type:String,
        unique: true,
        required: true,
        trim: true,
        lowercase: true,
        validate(value) {
            if (!validator.isEmail(value)) {
                throw new Error("Email is invalid")
            }
        }    
    },
    age: {
        type:Number,
        default: 0,
        validate(value) {
            if (value<0) {
                throw new Error("Age must be a positive number")
            }
        }
    },
    tokens: [{
        token: {
            type: String,
            required: true
        }    
    }],
    avatar: {
        type: Buffer
    }
  }, {
    timestamps: true
});

userSchema.index({ password: 1, email: 1 }, { unique: true});

// Making a virtual field for the relation between users and tasks

userSchema.virtual("tasks",{
    ref:"Task",
    localField: "_id",
    foreignField: "owner"
})


//(Instance method) get Public Profile (by deleting password and tokens) by converting this (the user) toJSON
userSchema.methods.toJSON = function() {
    const user = this
    const userObject = user.toObject()
    
    delete userObject.password
    delete userObject.tokens
    delete userObject.avatar
    
    return userObject
}

// (Instance method) generate auth token
userSchema.methods.generateAuthToken = async function () {
    const user = this
    const token = jwt.sign({ _id:user._id.toString() }, process.env.AUTH_TOKEN)
    user.tokens = user.tokens.concat({token:token})
    await user.save()
    return token
}

// findByCredentials (Model method with statics)
userSchema.statics.findByCredentials = async (email, password) => {
    
   const user = await User.findOne({email:email})
   
   if (!user) {
      throw new Error("Login faild")
   }

   const isMatch = await bcrypt.compare(password, user.password)

   if (!isMatch) {
       throw new Error("Login faild")
   }

   return user
}  

// Hash the password of the user before saving
userSchema.pre("save", async function (next) {
    const user = this
    if (user.isModified("password")) {
        user.password = await bcrypt.hash(user.password, 8)
    }
    
    next()
})

// Delete all tasks when the user has been removed
userSchema.pre("remove", async function(next) {
    const user = this
    await Task.deleteMany({owner:user._id})
    next()
})

const User = mongoose.model('User', userSchema);
module.exports = User