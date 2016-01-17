url = require("url");
var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');

var flash = require('connect-flash');

var db = require('./database');

var app = express();

//earths radius - cuz why not
var R = 6371000; // metres
var DISTANCE = 1500;
var namelist = ['Jerry', 'Terry', 'Berry', 'Cleary', 'Sup', 'OP', 'YourMom', 'Tim', 'Ally', 'Sarah', 'Celine', 'Tommy', 'Masheyat', 'Christy', '123', 'Guy', 'Gal', 'Justin', 'Drake', 'Andrea', 'Roman', 'Sally', 'Kenny', 'Stan', 'Lisa', 'Marge', 'Presentation Guy', 'Kyle', 'LifeisHard', 'Indico', 'NSpire'];


// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
//???
app.use(flash());
app.use(bodyParser.urlencoded({
    extended: false
}));
app.use(cookieParser());


app.use(express.static(path.join(__dirname, 'public')));


setInterval(checkplayers, 30000);

function checkplayers() {
    db.find({}, function (err, result) {
        if (err) {
            console.log(err.message);
        } else {
            var i;
            var a;
            for (i = 0; i < result.length; i++) {
                if (((new Date()).getTime() - result[i].last_checkin > 600000) && (result[i].device_id.search('bot') == 1)) {
                    //they didnt checkin in a while & not bot
                    if (result[i].type == '0') {
                        set_new_wackman(result[i]);
                    } else if (result[i].type == '1') {
                        //reassign it as a food
                        result[i].type = '2';
                        //TODO: assign a new ghost
                        for (a = 0; a < result.length; a++) {
                            if (result[a].type == '2') {
                                result[a].type = '1';
                                result[a].save(function (err) {
                                    if (err) {
                                        console.log(err);
                                    } else {
                                        //Done
                                    }
                                });
                                break;
                            }
                        }
                        result[i].save(function (err) {
                            if (err) {
                                console.log(err);
                            } else {
                                //Done
                            }
                        });
                    } else {
                        //do nothing if not ghost or wackman
                    }
                } else {
                    //do nothing
                }
            }
        }
    });

}


app.get('/players/list', function (req, res) {
    db.find({}, function (err, result) {
        if (!err) {
            res.status(200);
            res.send(JSON.stringify(result));
        } else {
            res.status(444);
            res.send(err.message);
        }
    });
});


app.get('/players/list/around', function (req, res) {
    get_peeps_around(parseFloat(req.param('x')), parseFloat(req.param('y')), parseFloat(req.param('radius')), function (result) {
        res.send(JSON.stringify(result));
    });
});

//get users around a coordinate
function get_peeps_around(xcord, ycord, radius, callback) {
    var xnum = parseFloat(xcord);
    var ynum = parseFloat(ycord);
    var radnum = parseFloat(radius);
    var peeps_around = [];
    db.find({}, function (err, list) {
        if (err) {
            res.status(500);
            res.send(err.message);
        } else {
            console.log(list);
            var i;
            for (i = 0; i < list.length; i++) {
                var dist = longlan_to_meters(list[i].location.x, xnum, list[i].location.y, ynum);
                console.log(dist);
                if (dist <= DISTANCE && dist >= -DISTANCE) {
                    peeps_around.push(list[i]);
                }
            }
            console.log(peeps_around);
            callback(peeps_around);
        }
    });
}

//get specific player and set type
app.get('/player/get/:name', function (req, res) {
    db.findOne({
        device_id: req.params.name
    }, function (err, player) {
        if (err) {
            res.status(444);
        } else {
            if (!player) {
                res.status(404);
            } else {
                if (player.type == '-1') {

                    setup_player(player, function (player) {
                        player.save(function (err) {
                            if (err) {
                                res.send(err.message);
                            } else {
                                res.status(200);
                                res.send(JSON.stringify(player));
                            }
                        });
                    });
                } else {
                    //player is already set
                    res.send(JSON.stringify(player));
                }
            }
        }
    });
});
//+-2
function setup_player(player, callback) {
    if (player.type != "-1") {
        callback(player);
    } else {
        get_peeps_around(player.location.x, player.location.y, player.location.Acc, function (result) {

            //get the result of wackmans, ghosts, and cherries to see what type the user is
            var i;
            var wackmanaround = false;
            for (i = 0; i < result.length; i++) {
                if (result[i].type == '0') {
                    wackmanaround = true;
                    break;
                }
            }

            if (wackmanaround) {
                //there is already a wackman around the area
                //lets say 40% chance of being a ghost and 50% chance of being a cherry and 10% of being a SuperFood
                var probability = Math.random();
                if (0 <= probability && probability < 0.4) {
                    //Ghost
                    player.type = '1'; //Kerry, Jerry, Berry, Coarl

                } else if (0.4 <= probability && probability < 0.9) {
                    //Cherry
                    player.type = '2';

                } else {
                    //Super Awesome Amazing Food!
                    player.type = '3';

                }

            } else {
                //Then he is the wackman
                player.type = '0';


                var num_food = 0;
                for (i = 0; i < result.length; i++) {
                    if (result.type == '2' || result.type == '3') {
                        num_food++;
                    }
                }
                //add bots while the num of foods is less than 5 in the area
                while (num_food < 5) {
                    if (Math.random() >= 0.5) {
                        var xcord = player.location.x + 0.001000 + (Math.random() * 0.001000);
                        if (Math.random() >= 0.5) {
                            var ycord = player.location.y + 0.001000 + (Math.random() * 0.001000);
                        } else {
                            var ycord = player.location.y - 0.001000 - (Math.random() * 0.001000);
                        }
                    } else {
                        var xcord = player.location.x - 0.001000 - (Math.random() * 0.001000);
                        if (Math.random() >= 0.5) {
                            var ycord = player.location.y + 0.001000 + (Math.random() * 0.001000);
                        } else {
                            var ycord = player.location.y - 0.001000 - (Math.random() * 0.001000);
                        }
                    }
                    add_bot(xcord, ycord, 2);
                    num_food++;
                }
            }

            callback(player);
        });
    }
}


//add bot to a coord
function add_bot(xcord, ycord, type) {
    var bot = new db({
        username: namelist[Math.floor(Math.random() * namelist.length)],
        location: {
            x: xcord,
            y: ycord,
            Acc: '10'
        },
        type: type,
        points: 0,
        invulnerable: 0,
        cooldown: 0,
        last_checkin: (new Date).getTime,
        device_id: "bot" + (new Date).getTime
    });
    bot.save(function (err) {
        if (err) {
            console.log(err);
        }
    });
}

//find distance between coords
function longlan_to_meters(lat1, lat2, lon1, lon2) {
    var Lat1 = lat1 * Math.PI / 180;
    var Lat2 = lat2 * Math.PI / 180;
    var deltalat = (lat2 - lat1) * Math.PI / 180;
    var deltaAlpha = (lon2 - lon1) * Math.PI / 180;

    var a = Math.sin(deltalat / 2) * Math.sin(deltalat / 2) +
        Math.cos(Lat1) * Math.cos(Lat2) *
        Math.sin(deltaAlpha / 2) * Math.sin(deltaAlpha / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    var d = R * c;
    return d;
}

//if player is idle for too long client sends a post req
app.post('/player/idle', function (req, res) {
    db.findOne({
        device_id: req.param('dev_id')
    }, function (err, player) {
        if (err) {
            res.status(500);
            res.send(err.message);
        } else {
            //turn player into cherry
            player.type = '2';
            player.save(function (err) {
                if (err) {
                    res.status(500);
                    res.send(err.message);
                } else {
                    set_new_wackman(player);
                }
            });

        }
    });
});


function set_new_wackman(player) {
    //get players around his location and set one the new wackman
    get_peeps_around(player.location.x, player.location.y, player.location.Acc, function (result) {
        var index = Math.floor(Math.random() * result.length);
        if (result[index].device_id == player.device_id) {
            //if its the same player
            result[((index + 1) % result.length)].type = '0';
            result[((index + 1) % result.length)].invulnerable = (new Date()).getTime();
            //NOTIFY HERE!
            result[((index + 1) % result.length)].save(function (err) {
                if (err) {
                    res.status(500);
                    res.send(err.message);
                } else {
                    res.status(200);
                    res.send("OK");
                }
            });

        } else {
            //not the same player
            result[index].type = '0';
            result[index].invulnerable = (new Date()).getTime();
            //NOTIFY HERE!
            result[index].save(function (err) {
                if (err) {
                    res.status(500);
                    res.send(err.message);
                } else {
                    res.status(200);
                    res.send("OK");
                }
            });
        }
    });
}


//create a new player with device id and username
app.post('/player/create', function (req, res) {
    db.findOne({
        device_id: req.param('dev_id')
    }, function (err, result) {
        if (err) {
            //server err
            res.status(500);
            res.send(err.message);
        } else {
            if (result) {
                //device is registered, change name
                db.findOne({
                    username: req.param('name')
                }, function (err, namefound) {
                    if (err) {
                        res.status(500);
                        res.send(err.message)
                    } else {
                        if (namefound && namefound.device_id != req.param('dev_id')) {
                            //name is already taken
                            res.status(400);
                            res.send("Name already taken");
                        } else {
                            //name is available, update name
                            result.username = req.param('name');
                            result.save(function (err) {
                                if (err) {
                                    res.status(500);
                                    res.send(err.message);
                                }
                                //return the updated user
                                res.status(200);
                                res.send(JSON.stringify(result));
                            });
                        }
                    }
                });

            }
            //create user with dev_id
            else {
                db.findOne({
                    username: req.param('name')
                }, function (err, namefound) {
                    if (err) {
                        res.status(500);
                        res.send(err.message)
                    } else {
                        if (namefound) {
                            //name taken
                            res.status(400);
                            res.send("Name already taken");
                        } else {
                            //name available
                            var newuser = new db({
                                username: req.param('name'),
                                //default values
                                location: {
                                    x: '0',
                                    y: '0',
                                    Acc: '0'
                                },
                                type: '-1', //-1, 0: Wackman, 1: Kerry, Jerry, Berry, Coarl, 2: Food, 3: SuperFood
                                points: 0,
                                invulnerable: 0,
                                cooldown: 0,
                                //dev_id
                                last_checkin: (new Date()).getTime(),
                                device_id: req.param('dev_id')
                            });

                            newuser.save(function (err) {
                                if (err) {
                                    res.status(500);
                                    res.send(err.message);
                                } else {
                                    //return user
                                    res.status(200);
                                    res.send(JSON.stringify(newuser));
                                }
                            });
                        }
                    }
                });
            }
        }
    });
});

app.get('/', function (req, res) {
    res.status(200);
    res.send("Whatcha doin' here");
});

//
//TODO - notifications
//     - cooldown
//EAT OR GET EATEN - Donald Trump 
app.post('/player/interact', function (req, res) {

    db.findOne({
        device_id: req.param('name')
    }, function (err, player) {
        if (err) {
            res.status(500);
        } else if (!player) {
            //player not found
            res.status(404);
            res.send('Player not found');
        } else {
            db.findOne({
                device_id: req.param('opponent')
            }, function (err, opponent) {
                if (err) {
                    res.status(500);
                    res.send(err.message);
                } else if (!opponent) {
                    res.status(404);
                    res.send('Cant find opp');
                } else {
                    //opponent and the player found
                    var curdate = (new Date()).getTime();
                    if ((curdate - player.cooldown > (1.8 * Math.pow(10, 6))) && (curdate - opponent.cooldown > (1.8 * Math.pow(10, 6)))) {

                        //if its not under cooldown
                        if (player.type == '0') {
                            //if wackman

                            if (opponent.type == '2') {
                                //  Why do we care about this We should do this in the opponents 
                                //part (aka if player == ghost and opponent is pacman)
                                player.points += 100;
                                opponent.type = '1'; //make it jerry :P
                                opponent.cooldown = curdate;
                                //set the cooldown time - it cant get eaten nor eat while on cooldown
                                //save--------------
                                player.save(function (err) {
                                    if (err) {
                                        res.send(err.message);
                                    } else {
                                        opponent.save(function (err) {
                                            if (err) {
                                                res.send(err.message);
                                            } else {
                                                res.send('OK');
                                            }
                                        });
                                    }
                                });
                                //------------------
                                //notify player
                            } else if (opponent.type == '3') {
                                //SuperFood
                                player.points += 100;
                                player.invulnerable = curdate;
                                opponent.type = '1';
                                opponent.cooldown = curdate;
                                //notify player
                                //save--------------
                                player.save(function (err) {
                                    if (err) {
                                        res.send(err.message);
                                    } else {
                                        opponent.save(function (err) {
                                            if (err) {
                                                res.send(err.message);
                                            } else {
                                                res.send('OK');
                                            }
                                        });
                                    }
                                });
                                //------------------
                            } else if (opponent.type == '1') {
                                if (curdate - player.invulnerable < (3.6 * Math.pow(10, 6))) {
                                    player.points += 300;
                                    var prob = Math.random();
                                    if (prob < 0.2) {
                                        opponent.type = '3';
                                    } else {
                                        opponent.type = '2';
                                    }
                                    opponent.cooldown = curdate;
                                    //notify player
                                    //save--------------
                                    player.save(function (err) {
                                        if (err) {
                                            res.send(err.message);
                                        } else {
                                            opponent.save(function (err) {
                                                if (err) {
                                                    res.send(err.message);
                                                } else {
                                                    res.send('OK');
                                                }
                                            });
                                        }
                                    });
                                    //------------------
                                }
                            }
                        } else if (player.type == '1') {

                            //if player ghost
                            if (opponent.type == '0') {
                                if (curdate - player.invulnerable > (3.6 * Math.pow(10, 6))) {
                                    player.points += 100;
                                    opponent.type = '2';
                                    opponent.cooldown = curdate;
                                    player.type = '0';
                                    //notify player
                                    //save--------------
                                    player.save(function (err) {
                                        if (err) {
                                            res.send(err.message);
                                        } else {
                                            opponent.save(function (err) {
                                                if (err) {
                                                    res.send(err.message);
                                                } else {
                                                    res.send('OK');
                                                }
                                            });
                                        }
                                    });
                                    //------------------
                                } else {
                                    res.send("Player Invinsible");
                                }
                            }
                        } else {
                            res.send("dude you shouldnt be here");
                        }

                    } else {
                        //else they are in cooldown no interaction
                        res.status(200);
                        res.send('COOLDOWN');
                        //notify player
                    }
                }
            });
        }

    });
});


//update coords
app.post('/player/update', function (req, res) {
    db.findOne({
        device_id: req.param('dev_id')
    }, function (err, player) {
        if (err) {
            res.status(500);
            res.send(err.message);
        } else {
            if (!player) {
                res.status(404);
                res.send("No player");
            } else {
                player.location.x = req.param('x');
                player.location.y = req.param('y');
                player.location.Acc = req.param('accuracy');
                player.last_checkin = (new Date()).getTime();
                setup_player(player, function (player) {
                    player.save(function (err) {
                        if (err) {
                            res.status(500);
                            res.send(err.message);
                        } else {
                            //return user
                            res.status(200);
                            res.send("OK");
                        }
                    });
                });
            }
        }

    });
});


// catch 404 and forward to error handler
app.use(function (req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});




// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function (err, req, res, next) {
        res.status(err.status || 500);
        res.send(err.message);
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function (err, req, res, next) {
    res.status(err.status || 500);
    res.send("Error");
});


module.exports = app;