(function() {
	var util = require('util');
	var http = require('http');
	
	Function.prototype.extend = function(superType) {
		var subType = this;
		subType.prototype = superType;
		subType.prototype.$super = superType;
		subType.prototype = new subType(
				Array.prototype.slice.call(1,arguments));
		subType.prototype.constructor = subType;
	};
	
	var Player = { // generic human/zombie
		x: 0,
		y: 0,
		age: 0,
		type: 0,
		grow: function() { // age by 1
			this.age++;
		},
		calcNewPos: function(xOdds,yOdds,N) {
			// gives a position based on input odds
			// odds are a vector of 2 elements, first being the odds
			// of negative, second being positive
			var dxSeed = Math.random();
			var dySeed = Math.random();
			var dx,dy;
			// find dx
			if (dxSeed<xOdds[0]) {dx=-1;}
			else if (dxSeed>1-xOdds[1]) {dx=1;}
			else {dx=0;}
			//find dy
			if (dySeed<yOdds[0]) {dy=-1;}
			else if (dySeed>1-yOdds[1]) {dy=1;}
			else {dy=0;}
			
			// limit dx and dy
			if (this.x+dx<0 || this.x+dx>=N) {dx=0;}
			if (this.y+dy<0 || this.y+dy>=N) {dy=0;}
			return [dx,dy];
		},
		distanceFrom: function(player) {
			// calc dist between players
			var dx = player.x-this.x;
			var dy = player.y-this.y;
			return [dx,dy];
		},
		nearestPlayerRelativeLoc: function(players) {
			var nearestPlayerDxdy = [0,0]; // delta x delta y
			var minDistSq = 99;
			// get distances from other humans
			for (var i=0;i<players.length;i++) {
				var otherPlayer = players[i];
				var dxdy = this.distanceFrom(otherPlayer);
				var distSq = Math.abs(
						Math.pow(dxdy[0],2) + Math.pow(dxdy[1],2));
				if (distSq !== 0 && distSq<minDistSq) {
					// if not current human and closer than last
					nearestPlayerDxdy = dxdy;
					minDistSq = distSq;
				}
			}
			return nearestPlayerDxdy;
		},
		isDead: function() {
			return false;
		},
		move: function(board,humans,zombies,N) {
			// move random
			var dxdy = this.calcNewPos([0.33,0.33],[0.33,0.33],N);
			var dx = dxdy[0];
			var dy = dxdy[1];
			// check not taken
			if (board[this.y+dy][this.x+dx] === 0) {
				this.x += dx;
				this.y += dy;
			}
		}
	};
	
	function Human(x,y) { // human form of player
		this.x = x;
		this.y = y;
		this.type=1;
		this.move = function(board,humans,zombies,N) {
			if (zombies.length === 0) {
				// if no zombies, random
				var dxdy = this.calcNewPos([0.33,0.33],[0.33,0.33],N);
				var dx = dxdy[0];
				var dy = dxdy[1];
				// check not taken
				if (board[this.y+dy][this.x+dx] === 0) {
					this.x += dx;
					this.y += dy;
				}
			}
			else {
				// if zombies move likely away from zombies
				// calc nearest
				var nearestZombieDxdy =
					this.nearestPlayerRelativeLoc(zombies);
				// calc odds
				var xOdds,yOdds;
				if (nearestZombieDxdy[0] < 0) {xOdds = [0.05,0.7];}
				else if (nearestZombieDxdy[0] > 0) {
					xOdds = [0.7,0.05];
				} else {xOdds = [0.3,0.3];}
				if (nearestZombieDxdy[1] < 0) {yOdds = [0.05,0.7];}
				else if (nearestZombieDxdy[1] > 0) {
					yOdds = [0.7,0.05];
				} else {yOdds = [0.3,0.3];}
				// apply
				var dxdy = this.calcNewPos(xOdds,yOdds,N);
				var dx = dxdy[0];
				var dy = dxdy[1];
				// check not taken
				if (board[this.y+dy][this.x+dx] === 0) {
					this.x += dx;
					this.y += dy;
				}
			}
		};
		this.isDead = function() {
			return false;
		};
		this.grow = function() {
			this.age++;
		};
	}
	Human.extend(Player);
	
	function Zombie(x,y) { // zombie form of player
		this.x = x;
		this.y = y;
		this.age = 0;
		this.type=-1;
		this.move = function(board,humans,zombies) {
			if (humans.length === 0) {
				// if no humans, random
				var dxdy = this.calcNewPos([0.33,0.33],[0.33,0.33],N);
				var dx = dxdy[0];
				var dy = dxdy[1];
				// check not taken
				if (board[this.y+dy][this.x+dx] === 0) {
					this.x += dx;
					this.y += dy;
				}
			}
			else {
				// if humans move likely away towards humans
				// calc nearest
				var nearestHumanDxdy =
					this.nearestPlayerRelativeLoc(humans);
				// calc odds
				var xOdds,yOdds;
				if (nearestHumanDxdy[0] < 0) {xOdds = [0.3,0.15];}
				else if (nearestHumanDxdy[0] > 0) {
					xOdds = [0.15,0.3];
				} else {xOdds = [0.2,0.2];}
				if (nearestHumanDxdy[1] < 0) {yOdds = [0.3,0.15];}
				else if (nearestHumanDxdy[1] > 0) {
					yOdds = [0.15,0.3];
				} else {yOdds = [0.2,0.2];}
				// apply
				var dxdy = this.calcNewPos(xOdds,yOdds,N);
				var dx = dxdy[0];
				var dy = dxdy[1];
				// check not taken or if human
				if (board[this.y+dy][this.x+dx] === 0 ||
						board[this.y+dy][this.x+dx] === 1) {
					this.x += dx;
					this.y += dy;
				}
			}
		};
		this.isDead = function() {
			return (this.age>10);
		};
		this.grow = function() {
			this.age++;
		};
	}
	Zombie.extend(Player);
	
	var zombieGame = {
		N: 0,
		board: [],
		humans: [],
		zombies: [],
		
		initBoard: function (N) { // initialise board
			this.N = N;
			var board = new Array(N);
			for (var n=0; n<N; n++) {
				board[n] = new Array(N);
				for (var m=0; m<N; m++) {
					board[n][m] = 0;
					//board[n][m] = Math.round(Math.random()*2)-1;
					// +1=human, -1=zombie
				}
			}
			this.board=board;
		},
		
		updateBoard: function () { // update board
			this.initBoard(this.N);
			for (var i=0; i<this.humans.length; i++) {
				var human = this.humans[i];
				this.board[human.y][human.x] = 1;
			}
			for (i=0; i<this.zombies.length; i++) {
				var zombie = this.zombies[i];
				if (this.board[zombie.y][zombie.x]===0) {
					this.board[zombie.y][zombie.x] = -1;
				}
				else {this.board[zombie.y][zombie.x] = 2;}
			}
		},
		
		addPlayer: function (player) { // add a zombie or human
			this.board[player.y][player.x] = player.type;
			
			if (player.type >0) {this.humans.push(player);}
			else {this.zombies.push(player);}
		},
		
		step: function () { // progress game to next frame
			var removeHuman = function(board,location) {
				// remove human, retain zombie if present
				board[location[1]][location[0]] -= 1;
				board[location[1]][location[0]] *= -1;
			};
			var removeZombie = function(board,location) {
				// remove zombie, retain human if present
				board[location[1]][location[0]] =
					Math.abs(board[location[1]][location[0]]);
				board[location[1]][location[0]] -= 1;
			};
			
			// step through humans
			for (var i=0; i<this.humans.length; i++) {
				var human = this.humans[i];
				
				//grow and move
				human.grow();
				var prevLoc = [human.x,human.y];
				this.humans[i].move(
						this.board,this.humans,this.zombies,this.N);
				var newLoc = [human.x,human.y];
				// no human anymore, retain zombie if present
				removeHuman(this.board,prevLoc);
				// no need to check if taken, humans shoudn't stack
				this.board[newLoc[1]][newLoc[0]] = 1;
			}
			for (i=0; i<this.zombies.length; i++) {
				var zombie = this.zombies[i];
				zombie.grow();
				console.log(zombie.age);
				while (zombie.isDead()) {
					removeZombie(this.board,[zombie.x,zombie.y]);
					this.zombies.splice(i,1);
					if (i<this.zombies.length) {
						zombie = this.zombies[i];
					}
					else {
						this.updateBoard();
						return;
					}
				}
				if (this.zombies.length===0) {return;}
				var prevLoc = [zombie.x,zombie.y];
				zombie.move(
						this.board,this.humans,this.zombies,this.N);
				var newLoc = [zombie.x,zombie.y];
				removeZombie(this.board,prevLoc);
				// check if taken
				if (this.board[newLoc[1]][newLoc[0]] === 1) {
					this.board[newLoc[1]][newLoc[0]] = 2;
				}
				else {this.board[newLoc[1]][newLoc[0]] = -1;}
			}
		},
	
		logBoard: function () { // log board to console
			for (var n=0; n<N; n++) {
				for (var m=0; m<N; m++) {
					if (this.board[n][m]===-1) {
						process.stdout.write("Z ");
					}
					else if (this.board[n][m]===1) {
						process.stdout.write("H ");
					}
					else if (this.board[n][m]===2) {
						process.stdout.write("X ");
					}
					else if (this.board[n][m]===0) {
						process.stdout.write("  ");
					}
					else {
						process.stdout.write("? ");
					}
				}
				console.log("|");
			}
		}
	};

	var N = 10; // board size
	zombieGame.initBoard(N);
	var human1 = new Human(4,5);
	var human2 = new Human(5,5);
	var zombie1 = new Zombie(5,6);
	var zombie2 = new Zombie(6,6);
	zombieGame.addPlayer(human1);
	zombieGame.addPlayer(human2);
	zombieGame.addPlayer(zombie1);
	zombieGame.addPlayer(zombie2);
	var input = "";
	var consoleTimer = setInterval(function() {
		zombieGame.step();
		zombieGame.logBoard();
		if (Math.random() < 0.1) {
			var x = Math.floor(Math.random()*N);
			var y = Math.floor(Math.random()*N);
			if (zombieGame.board[y][x]===0) {
				zombieGame.addPlayer(new Zombie(x,y));
			}
		}
	},500);
	
}());
	