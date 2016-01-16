var mongoose = require('mongoose');

mongoose.connect('mongodb://localhost/users');

var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function (callback) {
    // yay!
});

var UserSchema = mongoose.Schema({
    username: String,
    location: {
        x: String,
        y: String,
        Acc: String
    },
    type: String, //-1: undefined, 0: Wackman, 1: Kerry, Jerry, Berry, Coarl, 2: Food/SuperFood
    points: Number,
    invulnerable: Number, //getTime()
    device_id: String //64bits
});

var User = mongoose.model('User', UserSchema);
module.exports = User;