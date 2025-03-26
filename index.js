require('dotenv').config()
const express = require('express')
const cors = require('cors')
var morgan = require('morgan')

const app = express()
const Person = require('./models/person')

app.use(express.static('dist'))
app.use(express.json())
app.use(cors())

// middlewares
const unknownEndpoint = (request, response) => {
  response.status(404).send({ error: 'unknown endpoint' })
}

const errorHandler = (error, request, response, next) => {
  console.error(error.message)

  if (error.name === 'CastError') {
    return response.status(400).send({ error: 'malformatted id' })
  } else if (error.name === 'ValidationError') {
    return response.status(400).send({ error: error.message })
  }

  next(error)
}

morgan.token('body', (req) => {
  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
    return JSON.stringify(req.body)
  }
  return ''
})

app.use(
  morgan(':method :url :status :res[content-length] - :response-time ms :body')
)

app.get('/info', async (request, response) => {
  const persons = await Person.find({})
  const quantity = persons.length
  response.send(`
        <p>Phonebook has info for ${quantity} people</p>
        <p>${new Date().toString()}</p>
    `)
})

app.get('/api/persons', (request, response) => {
  Person.find({}).then((persons) => {
    response.json(persons)
  })
})

app.get('/api/persons/:id', (request, response, next) => {
  Person.findById(request.params.id)
    .then((person) => {
      if (person) {
        response.json(person)
      } else {
        response.status(404).end()
      }
    })
    .catch((error) => next(error))
})

app.post('/api/persons', async (request, response, next) => {
  const body = request.body

  const existingPerson = await Person.findOne({ name: body.name })

  if (existingPerson) {
    return updatePerson(existingPerson._id, body, response, next)
  }

  const person = new Person({
    name: body.name,
    number: body.number,
  })

  person
    .save()
    .then((personSaved) => {
      response.json(personSaved)
    })
    .catch((error) => next(error))
})

app.delete('/api/persons/:id', (request, response, next) => {
  Person.findByIdAndDelete(request.params.id)
    .then(() => response.status(204).end())
    .catch((error) => next(error))
})

app.put('/api/persons/:id', (request, response, next) => {
  updatePerson(request.params.id, request.body, response, next)
})

const updatePerson = (id, body, response, next) => {
  const { name, number } = body
  Person.findByIdAndUpdate(
    id,
    {
      name,
      number,
    },
    {
      new: true,
      runValidators: true,
      context: 'query',
    }
  )
    .then((updatedPerson) => response.json(updatedPerson))
    .catch((error) => next(error))
}

app.use(unknownEndpoint)
app.use(errorHandler)

const PORT = process.env.PORT
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
