const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

//register controller
const registerUser = async (req, res) => {
  try {
    //extract user information from request body
    const { username, email, password, role } = req.body;

    //check for existing user with same details
    const checkExistingUser = await User.findOne({
      $or: [{ username }, { email }],
    });

    if (checkExistingUser) {
      return res.status(400).json({
        success: false,
        message:
          "User with the following username or email already exists. Try with the different username or email",
      });
    }

    //hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    //create a new suer ans save in database
    const newlyCreatedUser = new User({
      username,
      email,
      password: hashedPassword,
      role: role || "user",
    });

    await newlyCreatedUser.save();

    if (newlyCreatedUser) {
      return res.status(201).json({
        success: true,
        message: "User registered Successfully!",
      });
    } else {
      return res.status(400).json({
        success: false,
        message: "Unable to register user! Please try again",
      });
    }
  } catch (error) {
    console.error("Error: ", error);
    return res.status(500).json({
      success: false,
      message: "Something Went Wrong!",
    });
  }
};

//login controller
const loginUser = async (req, res) => {
  try {
    const { username, password } = req.body;

    //check if user exists
    const user = await User.findOne({ username });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "User with the following username does not exists!",
      });
    }

    //check if password is correct
    const isPasswordMatch = await bcrypt.compare(password, user.password);

    if (!isPasswordMatch) {
      return res.status(400).json({
        success: false,
        message: "Invalid Credentials!",
      });
    }

    //create user token
    const accessToken = jwt.sign(
      {
        userId: user._id,
        username: user.username,
        role: user.role,
      },
      process.env.JWT_SECRET_KEY,
      { expiresIn: "15m" },
    );

    return res.status(200).json({
      success: true,
      message: "Login Successful",
      accessToken,
    });
  } catch (error) {
    console.error("Error: ", error);
    return res.status(500).json({
      success: false,
      message: "Something Went Wrong!",
    });
  }
};

const changePassword = async (req, res) => {
  try {
    const userId = req.userInfo.userId;

    //check if user exists in db
    const user = await User.findById(userId);

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid User!",
      });
    }

    const { oldPassword, newPassword } = req.body;

    //compare entered password and stored password
    const password = await bcrypt.compare(oldPassword, user.password);

    if (!password) {
      return res.status(400).json({
        success: false,
        message: "Current password and entered password do not match!",
      });
    }

    //generate hash for new password
    const salt = await bcrypt.genSalt(10);
    const newHashedPassword = await bcrypt.hash(newPassword, salt);

    //update in db
    user.password = newHashedPassword;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password changed successfully!",
    });
  } catch (error) {
    console.error("Error while changing password: ", error);
    return res.status(500).json({
      success: false,
      message: "Something Went Wrong!",
    });
  }
};

module.exports = { registerUser, loginUser, changePassword };
