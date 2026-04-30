const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    points: { type: Number, default: 0 },
    registeredAt: { type: Date, default: Date.now }
});

// To use this model in your code:
// const UserModel = require('../../database/models/ex-UserModel');
// const user = await UserModel.findOne({ userId: '123' });

module.exports = mongoose.model('User', userSchema);
