const UserModel = require('../models/ex-UserModel');

class UserFunctions {
    /**
     * Get a user's data from the database.
     * @param {string} userId
     */
    static async getUser(userId) {
        let user = await UserModel.findOne({ userId });
        if (!user) {
            user = await UserModel.create({ userId });
        }
        return user;
    }

    /**
     * Add points to a user.
     * @param {string} userId 
     * @param {number} amount 
     */
    static async addPoints(userId, amount) {
        return await UserModel.findOneAndUpdate(
            { userId },
            { $inc: { points: amount } },
            { new: true, upsert: true }
        );
    }
}

module.exports = UserFunctions;
