import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { User } from "../models/user.models.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken"


const generateToken = async(userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()
        user.refreshToken = refreshToken    
        await user.save({ validateBeforeSave: false })

        return { accessToken, refreshToken }
    } catch (error) {
        throw new ApiError(501, "Something went wrong while createing token")

    }
}
const registerUser = asyncHandler(async (req, res) => {
    // get user details from frontend
    const { fullName, email, userName, password } = req.body;

    console.log("email:", email);

    // validation -- not empty
    if ([fullName, email, userName, password].some((field) => !field?.trim())) {
        throw new ApiError(400, "All fields are required");
    }

    // normalize username
    const normalizedUserName = userName.toLowerCase();

    // check if user already exists: username or email
    const existedUser = await User.findOne({
        $or: [
            { userName: normalizedUserName },
            { email }
        ]
    });

    if (existedUser) {
        throw new ApiError(409, "User with email or username already exists");
    }

    // check for files
    const avatarLocalPath = req.files?.avatar?.[0]?.path;
    const coverImageLocalPath = req.files?.coverImage?.[0]?.path;

    console.log("req.files:", req.files);
    console.log("avatar path:", avatarLocalPath);

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required");
    }

    // upload files to cloudinary
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if (!avatar) {
        throw new ApiError(400, "Avatar upload failed on Cloudinary");
    }

    // create user object
    const user = await User.create({
        fullName,
        email,
        password,
        userName: normalizedUserName,
        avatar: avatar.url,
        coverImage: coverImage?.url || ""
    });

    // remove password and refreshToken from response
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    );

    // check for user creation
    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering user");
    }

    // return response
    return res.status(201).json(
        new ApiResponse(
            201,
            createdUser,
            "User registered successfully"
        )
    );
});
const loginUser = asyncHandler(async (req, res) => {

    const { email, userName, password } = req.body
    if (!userName && !email) {
        throw new ApiError(400, "username or email is required")
    }
    const existedUser = await User.findOne({
        $or: [{ userName }, { email }]
    })
    if (!existedUser) {
        throw new ApiError(404, "user not exist")
    }
    const isPasswordvalid = await existedUser.isPasswordCorrect(password)
    if (!isPasswordvalid) {
        throw new ApiError(401, "Invalid user credential")
    }
    const { accessToken, refreshToken } = await generateToken(existedUser._id)

    const loggedInUser = await User.findById(existedUser._id).select("-password -refreshToken")

    if (!loggedInUser) {
        throw new ApiError(500, "Something went wrong while login user")
    }
    const cookieOptions = {
        httpOnly: true,
        secure: true,
    }
    return res
        .status(200)
        .cookie("refreshToken", refreshToken, cookieOptions)
        .cookie("accessToken", accessToken, cookieOptions)
        .json(
            new ApiResponse(
                200,
                {
                    user: loggedInUser,
                    accessToken, refreshToken
                },
                "User logged in successfully"
            )
        )
    //Data from frontend 
    //validation 
    //check user exist karta hai ki nhi karta hai to login nhi to wapas se signup 
    //password check 
    //access token generate and refresh token 
    // send token in cookie
    // response 
})
const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(req.user._id,
        { $set: { refreshToken: undefined } },
        { new: true }
    )
    const cookieOptions = {
        httpOnly: true,
        secure: true,
    }
    return res
        .status(200)
        .clearCookie("refreshToken", cookieOptions)
        .clearCookie("accessToken", cookieOptions)
        .json(
            new ApiResponse(
                200,
                null,
                "User logged out successfully"
            )
        )
})
const refreshAccessToken = asyncHandler(async (req, res) => {
   const incomingRefreshToken= req.cookies.refreshToken || req.body.refreshToken
   if(!incomingRefreshToken){
    throw new ApiError(401, "Unauthorized Request")
   }
   try {
    const decodedToken =  jwt.verify(
     incomingRefreshToken,
     process.env.REFERSH_TOKEN_SECRET
    )
    const user = await User.findById(decodedToken?._id)
    if(!user){
     throw new ApiError (401, "Invalid refresh token ")
    }
    
    if(incomingRefreshToken !== user?.refreshToken){
     throw new ApiError(401, "Refresh token is expired or used")
    }
 
    const cookieOptions ={
     httpOnly : true,
     secure: true
    }
    const{accessToken, NewrefreshToken}=await generateToken(user._id)
    return res.status(200)
    .cookie("accessToken",accessToken,cookieOptions)
    .cookie("refreshToken",NewrefreshToken,cookieOptions)
    .json(
     new ApiResponse(
         200,
         {accessToken,refreshToken:NewrefreshToken},
         "accessToken refreshed"
     )
    )   
   } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refreshToken")
   }
})
export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken
} 