var mongoose = require('mongoose');

mongoose.connect('mongodb://heroku_kzl7l3v5:u7n9kcadbi1pe9nfinkviiq42b@ds047345.mongolab.com:47345/heroku_kzl7l3v5');

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
    cooldown: Number, //getTime()
    device_id: String //64bits
});

var User = mongoose.model('User', UserSchema);
module.exports = User;