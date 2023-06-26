 /**
         * Covert pixel distance to a 'real' distance.
         * @param {number} distance Pixel distance ran.
         * @return {number} The 'real' distance ran.
         */
 getActualDistance: function (distance) {
    return distance ? Math.round(distance * this.config.COEFFICIENT) : 0;
},

/**
 * Update the distance meter.
 * @param {number} distance
 * @param {number} deltaTime
 * @return {boolean} Whether the acheivement sound fx should be played.
 */
update: function (deltaTime, distance) {
    var paint = true;
    var playSound = false;

    if (!this.acheivement) {
        distance = this.getActualDistance(distance);
        // Score has gone beyond the initial digit count.
        if (distance > this.maxScore && this.maxScoreUnits ==
            this.config.MAX_DISTANCE_UNITS) {
            this.maxScoreUnits++;
            this.maxScore = parseInt(this.maxScore + '9');
        } else {
            this.distance = 0;
        }

        if (distance > 0) {
            // Acheivement unlocked
            if (distance % this.config.ACHIEVEMENT_DISTANCE == 0) {
                // Flash score and play sound.
                this.acheivement = true;
                this.flashTimer = 0;
                playSound = true;
            }

            // Create a string representation of the distance with leading 0.
            var distanceStr = (this.defaultString +
                distance).substr(-this.maxScoreUnits);
            this.digits = distanceStr.split('');
        } else {
            this.digits = this.defaultString.split('');
        }
    } else {
        // Control flashing of the score on reaching acheivement.
        if (this.flashIterations <= this.config.FLASH_ITERATIONS) {
            this.flashTimer += deltaTime;

            if (this.flashTimer < this.config.FLASH_DURATION) {
                paint = false;
            } else if (this.flashTimer >
                this.config.FLASH_DURATION * 2) {
                this.flashTimer = 0;
                this.flashIterations++;
            }
        } else {
            this.acheivement = false;
            this.flashIterations = 0;
            this.flashTimer = 0;
        }
    }

    // Draw the digits if not flashing.
    if (paint) {
        for (var i = this.digits.length - 1; i >= 0; i--) {
            this.draw(i, parseInt(this.digits[i]));
        }
    }

    this.drawHighScore();
    return playSound;
},

/**
 * Draw the high score.
 */
drawHighScore: function () {
    this.canvasCtx.save();
    this.canvasCtx.globalAlpha = .8;
    for (var i = this.highScore.length - 1; i >= 0; i--) {
        this.draw(i, parseInt(this.highScore[i], 10), true);
    }
    this.canvasCtx.restore();
},

/**
 * Set the highscore as a array string.
 * Position of char in the sprite: H - 10, I - 11.
 * @param {number} distance Distance ran in pixels.
 */
setHighScore: function (distance) {
    distance = this.getActualDistance(distance);
    var highScoreStr = (this.defaultString +
        distance).substr(-this.maxScoreUnits);

    this.highScore = ['10', '11', ''].concat(highScoreStr.split(''));
},

/**
 * Reset the distance meter back to '00000'.
 */
reset: function () {
    this.update(0);
    this.acheivement = false;
}
};


//******************************************************************************

/**
* Cloud background item.
* Similar to an obstacle object but without collision boxes.
* @param {HTMLCanvasElement} canvas Canvas element.
* @param {Object} spritePos Position of image in sprite.
* @param {number} containerWidth
*/
function Cloud(canvas, spritePos, containerWidth) {
this.canvas = canvas;
this.canvasCtx = this.canvas.getContext('2d');
this.spritePos = spritePos;
this.containerWidth = containerWidth;
this.xPos = containerWidth;
this.yPos = 0;
this.remove = false;
this.cloudGap = getRandomNum(Cloud.config.MIN_CLOUD_GAP,
    Cloud.config.MAX_CLOUD_GAP);

this.init();
};


/**
* Cloud object config.
* @enum {number}
*/
Cloud.config = {
HEIGHT: 14,
MAX_CLOUD_GAP: 400,
MAX_SKY_LEVEL: 30,
MIN_CLOUD_GAP: 100,
MIN_SKY_LEVEL: 71,
WIDTH: 46
};


Cloud.prototype = {
/**
 * Initialise the cloud. Sets the Cloud height.
 */
init: function () {
    this.yPos = getRandomNum(Cloud.config.MAX_SKY_LEVEL,
        Cloud.config.MIN_SKY_LEVEL);
    this.draw();
},

/**
 * Draw the cloud.
 */
draw: function () {
    this.canvasCtx.save();
    var sourceWidth = Cloud.config.WIDTH;
    var sourceHeight = Cloud.config.HEIGHT;

    if (IS_HIDPI) {
        sourceWidth = sourceWidth * 2;
        sourceHeight = sourceHeight * 2;
    }

    this.canvasCtx.drawImage(Runner.imageSprite, this.spritePos.x,
        this.spritePos.y,
        sourceWidth, sourceHeight,
        this.xPos, this.yPos,
        Cloud.config.WIDTH, Cloud.config.HEIGHT);

    this.canvasCtx.restore();
},

/**
 * Update the cloud position.
 * @param {number} speed
 */
update: function (speed) {
    if (!this.remove) {
        this.xPos -= Math.ceil(speed);
        this.draw();

        // Mark as removeable if no longer in the canvas.
        if (!this.isVisible()) {
            this.remove = true;
        }
    }
},

/**
 * Check if the cloud is visible on the stage.
 * @return {boolean}
 */
isVisible: function () {
    return this.xPos + Cloud.config.WIDTH > 0;
}
};


//******************************************************************************

/**
* Nightmode shows a moon and stars on the horizon.
*/
function NightMode(canvas, spritePos, containerWidth) {
this.spritePos = spritePos;
this.canvas = canvas;
this.canvasCtx = canvas.getContext('2d');
this.xPos = containerWidth - 50;
this.yPos = 30;
this.currentPhase = 0;
this.opacity = 0;
this.containerWidth = containerWidth;
this.stars = [];
this.drawStars = false;
this.placeStars();
};

/**
* @enum {number}
*/
NightMode.config = {
FADE_SPEED: 0.035,
HEIGHT: 40,
MOON_SPEED: 0.25,
NUM_STARS: 2,
STAR_SIZE: 9,
STAR_SPEED: 0.3,
STAR_MAX_Y: 70,
WIDTH: 20
};

NightMode.phases = [140, 120, 100, 60, 40, 20, 0];

NightMode.prototype = {
/**
 * Update moving moon, changing phases.
 * @param {boolean} activated Whether night mode is activated.
 * @param {number} delta
 */
update: function (activated, delta) {
    // Moon phase.
    if (activated && this.opacity == 0) {
        this.currentPhase++;

        if (this.currentPhase >= NightMode.phases.length) {
            this.currentPhase = 0;
        }
    }

    // Fade in / out.
    if (activated && (this.opacity < 1 || this.opacity == 0)) {
        this.opacity += NightMode.config.FADE_SPEED;
    } else if (this.opacity > 0) {
        this.opacity -= NightMode.config.FADE_SPEED;
    }

    // Set moon positioning.
    if (this.opacity > 0) {
        this.xPos = this.updateXPos(this.xPos, NightMode.config.MOON_SPEED);

        // Update stars.
        if (this.drawStars) {
            for (var i = 0; i < NightMode.config.NUM_STARS; i++) {
                this.stars[i].x = this.updateXPos(this.stars[i].x,
                    NightMode.config.STAR_SPEED);
            }
        }
        this.draw();
    } else {
        this.opacity = 0;
        this.placeStars();
    }
    this.drawStars = true;
},

updateXPos: function (currentPos, speed) {
    if (currentPos < -NightMode.config.WIDTH) {
        currentPos = this.containerWidth;
    } else {
        currentPos -= speed;
    }
    return currentPos;
},

draw: function () {
    var moonSourceWidth = this.currentPhase == 3 ? NightMode.config.WIDTH * 2 :
        NightMode.config.WIDTH;
    var moonSourceHeight = NightMode.config.HEIGHT;
    var moonSourceX = this.spritePos.x + NightMode.phases[this.currentPhase];
    var moonOutputWidth = moonSourceWidth;
    var starSize = NightMode.config.STAR_SIZE;
    var starSourceX = Runner.spriteDefinition.LDPI.STAR.x;

    if (IS_HIDPI) {
        moonSourceWidth *= 2;
        moonSourceHeight *= 2;
        moonSourceX = this.spritePos.x +
            (NightMode.phases[this.currentPhase] * 2);
        starSize *= 2;
        starSourceX = Runner.spriteDefinition.HDPI.STAR.x;
    }

    this.canvasCtx.save();
    this.canvasCtx.globalAlpha = this.opacity;

    // Stars.
    if (this.drawStars) {
        for (var i = 0; i < NightMode.config.NUM_STARS; i++) {
            this.canvasCtx.drawImage(Runner.imageSprite,
                starSourceX, this.stars[i].sourceY, starSize, starSize,
                Math.round(this.stars[i].x), this.stars[i].y,
                NightMode.config.STAR_SIZE, NightMode.config.STAR_SIZE);
        }
    }

    // Moon.
    this.canvasCtx.drawImage(Runner.imageSprite, moonSourceX,
        this.spritePos.y, moonSourceWidth, moonSourceHeight,
        Math.round(this.xPos), this.yPos,
        moonOutputWidth, NightMode.config.HEIGHT);

    this.canvasCtx.globalAlpha = 1;
    this.canvasCtx.restore();
},

// Do star placement.
placeStars: function () {
    var segmentSize = Math.round(this.containerWidth /
        NightMode.config.NUM_STARS);

    for (var i = 0; i < NightMode.config.NUM_STARS; i++) {
        this.stars[i] = {};
        this.stars[i].x = getRandomNum(segmentSize * i, segmentSize * (i + 1));
        this.stars[i].y = getRandomNum(0, NightMode.config.STAR_MAX_Y);

        if (IS_HIDPI) {
            this.stars[i].sourceY = Runner.spriteDefinition.HDPI.STAR.y +
                NightMode.config.STAR_SIZE * 2 * i;
        } else {
            this.stars[i].sourceY = Runner.spriteDefinition.LDPI.STAR.y +
                NightMode.config.STAR_SIZE * i;
        }
    }
},

reset: function () {
    this.currentPhase = 0;
    this.opacity = 0;
    this.update(false);
}

};


//******************************************************************************

/**
* Horizon Line.
* Consists of two connecting lines. Randomly assigns a flat / bumpy horizon.
* @param {HTMLCanvasElement} canvas
* @param {Object} spritePos Horizon position in sprite.
* @constructor
*/
function HorizonLine(canvas, spritePos) {
this.spritePos = spritePos;
this.canvas = canvas;
this.canvasCtx = canvas.getContext('2d');
this.sourceDimensions = {};
this.dimensions = HorizonLine.dimensions;
this.sourceXPos = [this.spritePos.x, this.spritePos.x +
    this.dimensions.WIDTH];
this.xPos = [];
this.yPos = 0;
this.bumpThreshold = 0.5;

this.setSourceDimensions();
this.draw();
};


/**
* Horizon line dimensions.
* @enum {number}
*/
HorizonLine.dimensions = {
WIDTH: 600,
HEIGHT: 12,
YPOS: 127
};


HorizonLine.prototype = {
/**
 * Set the source dimensions of the horizon line.
 */
setSourceDimensions: function () {

    for (var dimension in HorizonLine.dimensions) {
        if (IS_HIDPI) {
            if (dimension != 'YPOS') {
                this.sourceDimensions[dimension] =
                    HorizonLine.dimensions[dimension] * 2;
            }
        } else {
            this.sourceDimensions[dimension] =
                HorizonLine.dimensions[dimension];
        }
        this.dimensions[dimension] = HorizonLine.dimensions[dimension];
    }

    this.xPos = [0, HorizonLine.dimensions.WIDTH];
    this.yPos = HorizonLine.dimensions.YPOS;
},

/**
 * Return the crop x position of a type.
 */
getRandomType: function () {
    return Math.random() > this.bumpThreshold ? this.dimensions.WIDTH : 0;
},

/**
 * Draw the horizon line.
 */
draw: function () {
    this.canvasCtx.drawImage(Runner.imageSprite, this.sourceXPos[0],
        this.spritePos.y,
        this.sourceDimensions.WIDTH, this.sourceDimensions.HEIGHT,
        this.xPos[0], this.yPos,
        this.dimensions.WIDTH, this.dimensions.HEIGHT);

    this.canvasCtx.drawImage(Runner.imageSprite, this.sourceXPos[1],
        this.spritePos.y,
        this.sourceDimensions.WIDTH, this.sourceDimensions.HEIGHT,
        this.xPos[1], this.yPos,
        this.dimensions.WIDTH, this.dimensions.HEIGHT);
},

/**
 * Update the x position of an indivdual piece of the line.
 * @param {number} pos Line position.
 * @param {number} increment
 */
updateXPos: function (pos, increment) {
    var line1 = pos;
    var line2 = pos == 0 ? 1 : 0;

    this.xPos[line1] -= increment;
    this.xPos[line2] = this.xPos[line1] + this.dimensions.WIDTH;

    if (this.xPos[line1] <= -this.dimensions.WIDTH) {
        this.xPos[line1] += this.dimensions.WIDTH * 2;
        this.xPos[line2] = this.xPos[line1] - this.dimensions.WIDTH;
        this.sourceXPos[line1] = this.getRandomType() + this.spritePos.x;
    }
},

/**
 * Update the horizon line.
 * @param {number} deltaTime
 * @param {number} speed
 */
update: function (deltaTime, speed) {
    var increment = Math.floor(speed * (FPS / 1000) * deltaTime);

    if (this.xPos[0] <= 0) {
        this.updateXPos(0, increment);
    } else {
        this.updateXPos(1, increment);
    }
    this.draw();
},

/**
 * Reset horizon to the starting position.
 */
reset: function () {
    this.xPos[0] = 0;
    this.xPos[1] = HorizonLine.dimensions.WIDTH;
}
};


//******************************************************************************

/**
* Horizon background class.
* @param {HTMLCanvasElement} canvas
* @param {Object} spritePos Sprite positioning.
* @param {Object} dimensions Canvas dimensions.
* @param {number} gapCoefficient
* @constructor
*/
function Horizon(canvas, spritePos, dimensions, gapCoefficient) {
this.canvas = canvas;
this.canvasCtx = this.canvas.getContext('2d');
this.config = Horizon.config;
this.dimensions = dimensions;
this.gapCoefficient = gapCoefficient;
this.obstacles = [];
this.obstacleHistory = [];
this.horizonOffsets = [0, 0];
this.cloudFrequency = this.config.CLOUD_FREQUENCY;
this.spritePos = spritePos;
this.nightMode = null;

// Cloud
this.clouds = [];
this.cloudSpeed = this.config.BG_CLOUD_SPEED;

// Horizon
this.horizonLine = null;
this.init();
};


/**
* Horizon config.
* @enum {number}
*/
Horizon.config = {
BG_CLOUD_SPEED: 0.2,
BUMPY_THRESHOLD: .3,
CLOUD_FREQUENCY: .5,
HORIZON_HEIGHT: 16,
MAX_CLOUDS: 6
};


Horizon.prototype = {
/**
 * Initialise the horizon. Just add the line and a cloud. No obstacles.
 */
init: function () {
    this.addCloud();
    this.horizonLine = new HorizonLine(this.canvas, this.spritePos.HORIZON);
    this.nightMode = new NightMode(this.canvas, this.spritePos.MOON,
        this.dimensions.WIDTH);
},

/**
 * @param {number} deltaTime
 * @param {number} currentSpeed
 * @param {boolean} updateObstacles Used as an override to prevent
 *     the obstacles from being updated / added. This happens in the
 *     ease in section.
 * @param {boolean} showNightMode Night mode activated.
 */
update: function (deltaTime, currentSpeed, updateObstacles, showNightMode) {
    this.runningTime += deltaTime;
    this.horizonLine.update(deltaTime, currentSpeed);
    this.nightMode.update(showNightMode);
    this.updateClouds(deltaTime, currentSpeed);

    if (updateObstacles) {
        this.updateObstacles(deltaTime, currentSpeed);
    }
},

/**
 * Update the cloud positions.
 * @param {number} deltaTime
 * @param {number} currentSpeed
 */
updateClouds: function (deltaTime, speed) {
    var cloudSpeed = this.cloudSpeed / 1000 * deltaTime * speed;
    var numClouds = this.clouds.length;

    if (numClouds) {
        for (var i = numClouds - 1; i >= 0; i--) {
            this.clouds[i].update(cloudSpeed);
        }

        var lastCloud = this.clouds[numClouds - 1];

        // Check for adding a new cloud.
        if (numClouds < this.config.MAX_CLOUDS &&
            (this.dimensions.WIDTH - lastCloud.xPos) > lastCloud.cloudGap &&
            this.cloudFrequency > Math.random()) {
            this.addCloud();
        }

        // Remove expired clouds.
        this.clouds = this.clouds.filter(function (obj) {
            return !obj.remove;
        });
    } else {
        this.addCloud();
    }
},

/**
 * Update the obstacle positions.
 * @param {number} deltaTime
 * @param {number} currentSpeed
 */
updateObstacles: function (deltaTime, currentSpeed) {
    // Obstacles, move to Horizon layer.
    var updatedObstacles = this.obstacles.slice(0);

    for (var i = 0; i < this.obstacles.length; i++) {
        var obstacle = this.obstacles[i];
        obstacle.update(deltaTime, currentSpeed);

        // Clean up existing obstacles.
        if (obstacle.remove) {
            updatedObstacles.shift();
        }
    }
    this.obstacles = updatedObstacles;

    if (this.obstacles.length > 0) {
        var lastObstacle = this.obstacles[this.obstacles.length - 1];

        if (lastObstacle && !lastObstacle.followingObstacleCreated &&
            lastObstacle.isVisible() &&
            (lastObstacle.xPos + lastObstacle.width + lastObstacle.gap) <
            this.dimensions.WIDTH) {
            this.addNewObstacle(currentSpeed);
            lastObstacle.followingObstacleCreated = true;
        }
    } else {
        // Create new obstacles.
        this.addNewObstacle(currentSpeed);
    }
},

removeFirstObstacle: function () {
    this.obstacles.shift();
},

/**
 * Add a new obstacle.
 * @param {number} currentSpeed
 */
addNewObstacle: function (currentSpeed) {
    var obstacleTypeIndex = getRandomNum(0, Obstacle.types.length - 1);
    var obstacleType = Obstacle.types[obstacleTypeIndex];

    // Check for multiples of the same type of obstacle.
    // Also check obstacle is available at current speed.
    if (this.duplicateObstacleCheck(obstacleType.type) ||
        currentSpeed < obstacleType.minSpeed) {
        this.addNewObstacle(currentSpeed);
    } else {
        var obstacleSpritePos = this.spritePos[obstacleType.type];

        this.obstacles.push(new Obstacle(this.canvasCtx, obstacleType,
            obstacleSpritePos, this.dimensions,
            this.gapCoefficient, currentSpeed, obstacleType.width));

        this.obstacleHistory.unshift(obstacleType.type);

        if (this.obstacleHistory.length > 1) {
            this.obstacleHistory.splice(Runner.config.MAX_OBSTACLE_DUPLICATION);
        }
    }
},

/**
 * Returns whether the previous two obstacles are the same as the next one.
 * Maximum duplication is set in config value MAX_OBSTACLE_DUPLICATION.
 * @return {boolean}
 */
duplicateObstacleCheck: function (nextObstacleType) {
    var duplicateCount = 0;

    for (var i = 0; i < this.obstacleHistory.length; i++) {
        duplicateCount = this.obstacleHistory[i] == nextObstacleType ?
            duplicateCount + 1 : 0;
    }
    return duplicateCount >= Runner.config.MAX_OBSTACLE_DUPLICATION;
},

/**
 * Reset the horizon layer.
 * Remove existing obstacles and reposition the horizon line.
 */
reset: function () {
    this.obstacles = [];
    this.horizonLine.reset();
    this.nightMode.reset();
},

/**
 * Update the canvas width and scaling.
 * @param {number} width Canvas width.
 * @param {number} height Canvas height.
 */
resize: function (width, height) {
    this.canvas.width = width;
    this.canvas.height = height;
},

/**
 * Add a new cloud to the horizon.
 */
addCloud: function () {
    this.clouds.push(new Cloud(this.canvas, this.spritePos.CLOUD,
        this.dimensions.WIDTH));
}
};
})();


function onDocumentLoad() {
if (document.readyState === 'complete') {
new Runner('.interstitial-wrapper');
} else {
document.addEventListener('DOMContentLoaded', function() {
new Runner('.interstitial-wrapper');
});
}
}

onDocumentLoad();

document.addEventListener('DOMContentLoaded', onDocumentLoad);