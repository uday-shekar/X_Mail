import mongoose from "mongoose";
import bcrypt from "bcryptjs"; // ✅ safer than native bcrypt

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    userId: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[\w.-]+@xmail\.com$/, "User ID must end with @xmail.com"],
    },

    username: {
      type: String,
      trim: true,
      default: "",
    },

    password: {
      type: String,
      required: true,
      minlength: 6,
    },

    profilePic: {
      type: String,
      default: null,
    },

    refreshToken: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

// ✅ Ensure unique index
userSchema.index({ userId: 1 });

// 🔐 Hash password before save
userSchema.pre("save", async function (next) {
  try {
    if (!this.isModified("password")) return next();
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// 🔑 Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model("User", userSchema);
export default User;
