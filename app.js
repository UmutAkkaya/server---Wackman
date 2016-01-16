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
    get_peeps_around(parseFloat(req.param('x')), parseFloat(req.param('y')), parseFloat(req.param('radius')), function (err, result) {
        if (!err) {
            res.send(JSON.stringify(result));
        } else {
            res.status(444);
        }
    });
});

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
                //default distance is 1500 km
                if (dist <= 1500 && dist >= -1500) {
                    peeps_around.push(list[i]);
                }
            }
            console.log(peeps_around);
            callback(peeps_around);
        }
    });
}
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
                            //lets say 30% chance of being a ghost and 60% chance of being a cherry and 10% of being a SuperFood
                            var probability = Math.random();
                            if (0 <= probability && probability < 0.3) {
                                //Ghost
                                player.type = '1'; //Kerry, Jerry, Berry, Coarl
                                player.save(function (err) {
                                    if (err) {
                                        res.send(err.message);
                                    } else {
                                        res.status(200);
                                        res.send(JSON.stringify(player));
                                    }
                                });
                            } else if (0.3 <= probability && probability < 0.9) {
                                //Cherry
                                player.type = '2';
                                player.save(function (err) {
                                    if (err) {
                                        res.send(err.message);
                                    } else {
                                        res.status(200);
                                        res.send(JSON.stringify(player));
                                    }
                                });
                            } else {
                                //Super Awesome Amazing Food!
                                player.type = '3';
                                player.save(function (err) {
                                    if (err) {
                                        res.send(err.message);
                                    } else {
                                        res.status(200);
                                        res.send(JSON.stringify(player));
                                    }
                                });
                            }
                        } else {
                            //Then he is the wackman
                            player.type = '0';
                            player.save(function (err) {
                                if (err) {
                                    res.send(err.message);
                                } else {
                                    res.status(200);
                                    res.send(JSON.stringify(player));
                                }
                            });
                        }
                    });

                } else {
                    //player is already set
                    res.send(JSON.stringify(player));
                }
            }
        }
    });
});

function longlan_to_meters(lat1, lat2, lon1, lon2) {
    console.log("calculating distance");
    console.log("lat1: " + lat1);
    console.log("lat2: " + lat2);
    console.log("lon1: " + lon1);
    console.log("lon2: " + lon2);
    var Lat1 = lat1 * Math.PI / 180;
    var Lat2 = lat2 * Math.PI / 180;
    var deltalat = (lat2 - lat1) * Math.PI / 180;
    var deltaAlpha = (lon2 - lon1) * Math.PI / 180;

    var a = Math.sin(deltalat / 2) * Math.sin(deltalat / 2) +
        Math.cos(Lat1) * Math.cos(Lat2) *
        Math.sin(deltaAlpha / 2) * Math.sin(deltaAlpha / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    var d = R * c;
    console.log("d: " + d);
    return d;
}

var test = longlan_to_meters(43.659916, 43.654452, -79.388647, -79.385407);
console.log(test);

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
                        if (namefound) {
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
//
//TODO - notifications
//EAT OR GET EATEN - Donald Trump 
app.post('/player/interact', function (req, res) {
    db.findOne({
        name: req.param('name')
    }, function (err, player) {
        if (err) {
            res.status(500);
        } else if (!player) {
            //player not found
            res.status(404);
        } else {
            db.findOne({
                name: req.param('opponent')
            }, function (err, opponent) {
                if (err) {
                    res.status(500);
                    res.send(err.message);
                } else if (!opponent) {
                    res.status(404);
                    res.send('Cant find opp');
                } else {
                    //opponent and the player found
                    if ((Date.getTime() - player.cooldown > (1.8 * Math.pow(10, 6))) && (Date.getTime() - opponent.cooldown > (1.8 * Math.pow(10, 6)))) {
                        //if its not under cooldown
                        if (player.type == '0') {
                            //if wackman

                            if (opponent.type == '2') {
                                //  Why do we care about this We should do this in the opponents 
                                //part (aka if player == ghost and opponent is pacman)
                                player.points += 100;
                                opponent.type = '1'; //make it jerry :P
                                opponent.cooldown = Date.getTime();
                                //set the cooldown time - it cant get eaten nor eat while on cooldown

                                //notify player
                            } else if (opponent.type == '3') {
                                //SuperFood
                                player.points += 100;
                                player.invulnerable = Date.getTime();
                                opponent.type = '1';
                                opponent.cooldown = Date.getTime();
                                //notify player
                            } else if (opponent.type == '1') {
                                var curtime = Date.getTime();
                                if (curtime - player.invulnerable < (3.6 * Math.pow(10, 6))) {
                                    player.points += 300;
                                    var prob = Math.random();
                                    if (prob < 0.2) {
                                        opponent.type = '3';
                                    } else {
                                        opponent.type = '2';
                                    }
                                    opponent.cooldown = Date.getTime();
                                    //notify player
                                }
                            }
                        } else if (player.type == '1') {
                            if (opponent.type == '0') {
                                if (curtime - player.invulnerable > (3.6 * Math.pow(10, 6))) {
                                    player.points += 100;
                                    opponent.type = '2';
                                    opponent.cooldown = Date.getTime();
                                    player.type = '0';
                                    //notify player
                                }
                            }
                        }
                        //save--------------
                        player.save(function (err) {
                            if (err) {
                                res.send(err.message);
                            }
                        });
                        opponent.save(function (err) {
                            if (err) {
                                res.send(err.message);
                            }
                        });
                        //----------------
                    }
                    //else they are in cooldown no interaction
                    //notify player
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