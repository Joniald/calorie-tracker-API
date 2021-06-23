const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
    description: {
        type: String,
        minLength: [3,"The min description length should be 3 letters with space"],
        maxLength:100,
        trim: true,
        required:true
    },
    mealType: {
        type: String,
        enum: ['Breakfast', 'Brunch', 'Snack', 'Lunch', 'Dinner'],
        required:true  
    },
    calories: {
        type: Number,
        default: 0,
        validate(value) {
            if (value<0) {
                throw new Error("Calories must be a positive number")
            }
        }
    },
    imageFood: {
        type: Buffer
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: "User"
    }
}, {
    timestamps: true
})

const Task = mongoose.model("Task", taskSchema);
module.exports = Task
