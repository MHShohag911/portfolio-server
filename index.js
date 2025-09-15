const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const nodemailer = require("nodemailer");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const port = process.env.PORT || 5000;

// Middleware
app.use(
  cors({
    origin: ["http://localhost:5173"],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.yroh67c.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});
async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    const projectsLinks = client
      .db("portfolioDB")
      .collection("portfolioWebLinks");
    const users = client
      .db("portfolioDB")
      .collection("userDB");
    const messages = client.db("portfolioDB").collection("messages");

    /*----------------------------
    // JWT Related API
    -----------------------------*/
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: false,
          sameSite: "lax",
        })
        .send({ success: true });
      console.log(token);
    });


    /*----------------------------
    // Middlewares
    -----------------------------*/
    const verifyToken = (req, res, next) => {
      console.log("inside verify token", req.cookies);
      const token = req?.cookies?.token;
      if (!token) {
        return res.status(401).send({ message: "Unauthorized Access" });
      }

      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: "Unauthorized Access" });
        }
        req.user = decoded;
        next();
      });
    };

    /*----------------------------
    // Get Method
    -----------------------------*/
    app.get("/projects-links", async (req, res) => {
      const result = await projectsLinks.find().toArray();
      res.send(result);
    });

    app.get("/users", verifyToken, async (req, res) => {
      const result = await users.find().toArray();
      res.send(result);
    });

    app.get('/messages', async(req, res) => {
      const result = await messages.find().toArray();
      res.send(result)
    })

    app.get("/super-shohag/edit/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const query = { _id: new ObjectId(id) };
      const result = await projectsLinks.findOne(query);
      res.send(result);
    });

    /*----------------------------
    // Post Method
    -----------------------------*/
    // Sending Message Using Nodemail
    app.post("/send", async (req, res) => {
      const { name, email, message } = req.body.values;

      // for mongodb
      const newMessage = {
        name, email, message, createdAt: new Date()
      }
      result = await messages.insertOne(newMessage);

      // for sending email
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: `${process.env.NODEMAILER_EMAIL}`,
          pass: `${process.env.NODEMAILER_PASSWORD}`,
        },
      });

      await transporter.sendMail({
        from: `${process.env.NODEMAILER_EMAIL}`,
        to: `${process.env.NODEMAILER_EMAIL}`,
        replyTo: email,
        subject: `Mew Message from ${name}`,
        text: message,
      });
      res.status(200).json({ message: "Email sent successfully" });
    });

    app.post('/super-shohag/add', async(req, res) => {
      const project = req.body;
      const result = await projectsLinks.insertOne(project);
      res.send(result)
    })

    app.post('/users', async(req, res) => {
      const user = req.body;
      const result = await users.insertOne(user);
      res.send(result)
    })


    /*----------------------------
    // Patch Method
    -----------------------------*/
    app.patch("/super-shohag/edit/:id", verifyToken, async (req, res) => {
      const project = req.body;
      const id = req.params.id;
      console.log(project, id);
      const filter = { _id: new ObjectId(id) };
      const updatedValues = {
        $set: {
          name: project.name,
          image: project.image,
          projectLink: project.projectLink,
          description: project.description,
          technologies: project.technologies,
          githubLink: project.githubLink,
          type: project.type,
          status: project.status,
          features: project.features,
          tags: project.tags,
        },
      };
      const result = await projectsLinks.updateOne(filter, updatedValues);
      res.send(result);
    });

    app.patch('/users/admin/:id', async(req, res) => {
      const id = req.params.id;
      const filter = {_id: new ObjectId(id)}
      const updatedUser = {
        $set: {
          role: 'Admin'
        }
      }
      const result = await users.updateOne(filter, updatedUser);
      res.send(result)
    })

    /*----------------------------
    // Delete Method
    -----------------------------*/
    // Delete User
    app.delete('/users/:id', async(req, res) => {
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const result = await users.deleteOne(query);
      res.send(result)
    })

    // Delete Project
    app.delete('/projects-links/:id', async(req, res) => {
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const result = await projectsLinks.deleteOne(query);
      res.send(result)
    })









    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Portfolio server is running");
});
app.listen(port, () => {
  console.log("Server running on port: ", port);
});
