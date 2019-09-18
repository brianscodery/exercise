const express = require('express')
const app = express()
const bodyParser = require('body-parser')

const cors = require('cors')

const mongoose = require('mongoose')
mongoose.connect(process.env.MONGO_URI,  {useNewUrlParser: true, useUnifiedTopology: true })

app.use(cors())

app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())


app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});


// // Not found middleware
// app.use((req, res, next) => {
//   next({status: 404, message: 'not found'})
// })

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})

const Exercise = new mongoose.Schema({
  description: String,
  date: Date,
  duration: Number
})
const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true
  },
  exercises: [Exercise]
})
const User = mongoose.model('User', UserSchema);



const handleNewUser = (req, res) => {
  const username = req.body.username
  const user = new User({username})
  user.save((err, data) =>{
    if (err){
      res.send(err)
    }
    res.send(data)
  })
}

app.post('/api/exercise/new-user', handleNewUser)

const getAllUsers = (req, res) => {
  User.find({},(err, users) => {
    if(err){
      res.send(err)
    }
    res.send(users)
  })
}

app.get('/api/exercise/users', getAllUsers)


  
const addExercise = (req, res) => {
  const {userId, date: dateString, duration, description} = req.body;
  const date = dateString ? new Date(dateString) : new Date()
  User.findByIdAndUpdate(
    userId,
    {$push: {
        exercises: {description, date, duration}
    }},
    {new: true},
    (err, user) => {
      if(err) {
        res.send(err)
      }
      res.send(user)
    })
}
  
  
app.post('/api/exercise/add', addExercise)


const getExercises = async (req, res) => {
  const {userId, from, to, limit} = req.query;
  let fromDate, toDate
  if (from) {
    fromDate = new Date(from)
    console.log(fromDate)
  }
  if (to) {
    toDate = new Date(to)
  }
  const userData = await User.findById(userId)
    .catch(err => res.send(err))
  const exercises = userData.exercises.filter(exercise => {
    if (from && fromDate.getTime() > exercise.date.getTime()) {
      return false
    }    
    if (to && toDate.getTime() < exercise.date.getTime()) {
      return false
    }
    return true
  }).slice(0, limit)
     
  res.send({userId, username: userData.username, exercises})
}


// GET /api/exercise/log?{userId}[&from][&to][&limit]

app.get('/api/exercise/log', getExercises)