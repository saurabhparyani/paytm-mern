const express = require("express");
const userRouter = express.Router();
const zod = require("zod");
const { User, Account } = require("../db");
const JWT_SECRET = require("../config");

const jwt = require("jsonwebtoken");
const authMiddleware = require("../middleware");

const signupSchema = zod.object({
    username: zod.string().email(),
    password: zod.string(),
    firstName: zod.string(),
    lastName: zod.string(),
})

const signinSchema = zod.object({
    username: zod.string().email(),
    password: zod.string()
})


const updateSchema = zod.object({
    password: zod.string().optional(),
    firstName: zod.string().optional(),
    lastName: zod.string().optional()
})


userRouter.post("/signup", async (req, res) => {
    const createPayload = req.body;
    const parsedPayload = signupSchema.safeParse(createPayload);
    if (!parsedPayload.success) {
        res.status(411).json({
            message: "Incorrect inputs!"
        })
        return;
    }

    const existingUser = await User.findOne({
        username: createPayload.username
    })

    if (existingUser) {
        res.status(411).json({
            message: "Email already taken!"
        })
    }

    const user = await User.create({
        username: createPayload.username,
        password: createPayload.password,
        firstName: createPayload.firstName,
        lastName: createPayload.lastName,
    })

    const userId = user._id;

    await Account.create({
        userId,
        balance: 1 + Math.random() * 10000
    })


    const token = jwt.sign({
        userId: userId
    }, JWT_SECRET)

    res.status(200).json({
        message: "User created successfully!",
        token: token
    })
})

userRouter.post("/signin", async (req, res) => {
    const createPayload = req.body;
    const parsedPayload = signinSchema.safeParse(createPayload);
    if (!parsedPayload.success) {
        res.status(411).json({
            message: "Incorrect inputs!"
        })
        return;
    }

    const existingUser = await User.findOne({
        username: createPayload.username,
        password: createPayload.password
    })

    if (!existingUser) {
        res.status(411).json({
            message: "Error while logging in!"
        })
        return;
    }

    const userId = existingUser._id;
    const token = jwt.sign({
        userId: userId
    }, JWT_SECRET)

    res.status(200).json({
        token: token
    })

})

userRouter.put("/", authMiddleware, async (req, res) => {
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(411).json({
            message: "Error while updating information"
        })
        return;
    }

    await User.updateOne({
        _id: req.userId
    }, { $set: req.body })

    res.status(200).json({
        message: "Updated successfully!"
    })


})

userRouter.get("/bulk", async (req, res) => {
    const filter = req.query.filter || "";

    const users = await User.find({
        $or: [
            {
                firstName: {
                    "$regex": filter,
                    "$options": "i"
                }
            },
            {
                lastName: {
                    "$regex": filter,
                    "$options": "i"
                }
            }
        ]
    })

    res.json({
        user: users.map(u => ({
            username: u.username,
            firstName: u.firstName,
            lastName: u.lastName,
            _id: u._id
        }))
    })
})

module.exports = userRouter;
