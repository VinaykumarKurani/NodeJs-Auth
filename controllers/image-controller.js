const Image = require("../models/Image");
const { uploadToCloudinary } = require("../helpers/coludinary-helper");
const fs = require("fs");
const cloudinary = require("../config/cloudinary");
const uploadImageController = async (req, res) => {
  try {
    //check if file is missing in request object
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "File is required. Please upload an image",
      });
    }

    //upload to cloudinary
    const { url, publicId } = await uploadToCloudinary(req.file.path);

    //save the url and publicId with the user to the database
    const savePathToDb = new Image({
      url,
      publicId,
      uploadedBy: req.userInfo.userId,
    });

    await savePathToDb.save();

    //to remove file after uploading
    fs.unlinkSync(req.file.path);

    return res.status(201).json({
      success: true,
      message: "File uploaded successfully",
      image: savePathToDb,
    });
  } catch (error) {
    console.error("Error uploading image: ", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong!",
    });
  }
};

const getUploadedImages = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const skip = (page - 1) * limit;

    const sortBy = req.query.sortBy || "createdAt";
    const sortOrder = req.query.sortOrder === "asc" ? 1 : -1;
    const totalImages = await Image.countDocuments();
    const totalPages = Math.ceil(totalImages / limit);

    const sortObj = {};
    sortObj[sortBy] = sortOrder;

    const fetchImages = await Image.find()
      .sort(sortObj)
      .skip(skip)
      .limit(limit);

    if (fetchImages) {
      return res.status(200).json({
        success: true,
        message: "Uploaded images fetched successfully!",
        currentPage: page,
        totalPages: totalPages,
        totalImages: totalImages,
        data: fetchImages,
      });
    } else {
      return res.status(404).json({
        success: false,
        message: "No images found!",
      });
    }
  } catch (error) {
    console.error("Error fetching images: ", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong!",
    });
  }
};

const deleteImageController = async (req, res) => {
  try {
    const imageID = req.params.id;
    const userID = req.userInfo.userId;

    const image = await Image.findById(imageID);

    if (!image) {
      return res.status(404).json({
        success: false,
        message: "Image not found!",
      });
    }

    //check if the image is uploaded by current user
    if (image.uploadedBy.toString() !== userID) {
      return res.status(403).json({
        success: false,
        message: "You don't have the rights to delete this image!",
      });
    }

    //delete the image first from cloudinary
    await cloudinary.uploader.destroy(image.publicId);

    //delete image from database
    await Image.findByIdAndDelete(imageID);

    return res.status(200).json({
      success: true,
      message: "Image Deleted Successfully!",
    });
  } catch (error) {
    console.error("Error deleting images: ", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong!",
    });
  }
};
module.exports = {
  uploadImageController,
  getUploadedImages,
  deleteImageController,
};
