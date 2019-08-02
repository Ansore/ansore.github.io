function Fireworks(sky, loop){
    this.sky = sky;
    this.skyWidth = document.body.clientWidth || document.documentElement.clientWidth;
    this.skyHeight= document.body.clientHeight || document.documentElement.clientHeight;
    this.x = this.y = 0;
    this.step = 20;
    this.delay = 30;
    this.stars = [];
    this.r = 10;
    this.step2 = 7;
    this.radius = 90;
    this.angle = 45;
    this.num = 16;
    this.loop = loop;
    this.degree = 2;
    this.t = 0;
    this.delt = 0;
    this.max = 30;
    this.cur = 1;
    this.points = null;
}
Fireworks.prototype = {
    init : function(){
        this.x = parseInt(this.skyWidth/1.3 * Math.random()) + this.skyWidth / 8;
        this.y = this.skyHeight;
        this._y = parseInt((this.skyHeight / 4) * Math.random()) + this.skyHeight / 5;
    },
    setOpacity : function(obj, p){
        if(p > 85){
            var opacity = 100 - (p - 85) * 4;
            if(document.all){
                obj.style.filter = "alpha(opacity=" + opacity + ")";    
            }else{
                obj.style.MozOpacity = opacity / 100;
            }
        }
    },
    getNextPoint : function(degree, coeff, t){
        var tt = 1.0 - t;
        for(var rr = 1; rr <= degree; rr++){
            for(var i=0; i <= degree-rr; i++){
                coeff[i] = tt * coeff[i] + t * coeff[i+1];
            }
        }
        return coeff[0];
    },
    showBall : function(){
        this.ball = document.createElement("div");
        this.ball.innerHTML = "●";
        this.ball.className = "ball";
        this.ball.style.left = this.x + "px";
        this.ball.style.top = this.y + "px";
        this.sky.appendChild(this.ball);
    },
    moveBall : function(){
        var self = this;
        if(this.y > this._y){
            var p = parseInt((this.skyHeight - this.y) / (this.skyHeight - this._y)*10);
            this.y -= (this.step - p * 1.6);
            this.ball.style.fontSize = 16 - p + "px";
            this.ball.style.top = this.y + "px";
            setTimeout(function(){self.moveBall();}, this.delay);
        }else{
            this.fire();
        }
    },
    hideBall : function(){
        this.sky.removeChild(this.ball);
        this.ball = null;
    },

    showStars : function(){
        var colors = ['#FF0000','#FF00FF','#00FF00','#00FFFF','#FFFF00','#FF0000','#FF00FF','#00FF00','#00FFFF','#FFFF00'];
        var n = cs = parseInt(Math.random() * colors.length / 2);
        var cc = parseInt(Math.random() * colors.length  / 2);
        var colorMode = parseInt(Math.random() * 2);
        var star = Math.round(Math.random()) == 1 ? "♥" : "♡";
        this.r = 10;
        this.radius = Math.round(Math.random() * 30) + 60;
        this.num = Math.round(Math.random() * 5 + 5) * 2;
        this.angle = 180 / this.num * 2;
        
        for(var i=1; i<=this.num; i++){
            this.stars[i] = document.createElement("div");
            this.stars[i].innerHTML = star;
            this.stars[i].className = "star";
            if(colorMode == 1){
                this.stars[i].style.color = colors[n];
                if(++n > cs + cc)
                    n = cs;
            }else{
                this.stars[i].style.color = colors[parseInt(Math.random() * colors.length)];
            }
            this.sky.appendChild(this.stars[i]);
        }
    },
    moveStars : function(){
        var self = this;
        if(this.r < this.radius){
            var p = this.step2 - parseInt(this.r / this.radius * 5);
            p = p < 1 ? 1 : p;
            this.r += p;
            p = parseInt(this.r / this.radius * 100);
            for(var i=1; i<=this.num; i++){
                this.stars[i].style.left = this.x - Math.round(this.r * Math.sin(Math.PI - (Math.PI / 180 * this.angle * i))) + "px";
                this.stars[i].style.top = this.y - Math.round(this.r * Math.cos(Math.PI - (Math.PI / 180 * this.angle * i))) + "px";
                this.stars[i].style.fontSize = 4 + p/10 + "px";
                this.setOpacity(this.stars[i], p);
            }
            setTimeout(function(){self.moveStars();}, this.delay);
        }else{
            setTimeout(function(){self.hideStars();}, 200 * Math.random());
        }
    },
    initBezier : function(){
        var coeff_x = [];
         var coeff_y = [];
        
        this.points = [];
        this.t = 0;
        this.delt = 1.0 / this.max;
        this.cur = 1;
        var a = parseInt(Math.random() * 5) * 90;
        coeff_x[0] = this.x;
        coeff_y[0] = this.y;
        for(var i=1; i<=this.num; i++){
            coeff_x[1] = this.x + Math.sin(Math.PI - (Math.PI / 180 * this.angle * i)) * this.radius/2;
            coeff_y[1] = this.y + Math.cos(Math.PI - (Math.PI / 180 * this.angle * i)) * this.radius/2;
            coeff_x[2] = this.x + Math.sin(Math.PI - (Math.PI / 180 * (a-this.angle * i))) * this.radius;
            coeff_y[2] = this.y + Math.cos(Math.PI - (Math.PI / 180 * (a-this.angle * i))) * this.radius;
            this.points[(i-1)*2] = coeff_x.slice(0);
            this.points[(i-1)*2+1] = coeff_y.slice(0);
        }
    },
    moveStars2 : function(){
        var self = this;
        if(this.cur < this.max){
            this.t += this.delt;
            this.cur++;
            p = parseInt(this.cur / this.max * 100);
            for(var i=1; i<=this.num; i++){
                this.stars[i].style.left = this.getNextPoint(this.degree, this.points[(i-1)*2], this.t) + "px";
                this.stars[i].style.top = this.getNextPoint(this.degree, this.points[(i-1)*2+1], this.t) + "px";
                this.stars[i].style.fontSize = 4 + p/10 + "px";
                this.setOpacity(this.stars[i], p);
            }
            setTimeout(function(){self.moveStars2();}, this.delay);
        }else{
            setTimeout(function(){self.hideStars();}, 200 * Math.random());
        }
    },
    hideStars : function(){
        for(var i=1; i<=this.num; i++){
            this.sky.removeChild(this.stars[i]);
            this.stars[i] = null;
            if(this.points != null){
                delete this.points[(i-1)*2];
                delete this.points[(i-1)*2+1];
            }
        }
        if(this.points){
            delete this.points;
        }
        this.points = null;
        if(this.loop){
            this.play();
        }
    },
    fire : function(){
        this.hideBall();
        this.showStars();
        
        var effect = parseInt(Math.random() * 2) + 1;
        switch(effect){
            case 1:
                this.moveStars();
                break;
            case 2:
                this.initBezier();
                this.moveStars2();
                break;
        }
    },
    play : function(){
        this.init();
        this.showBall();
        this.moveBall();
    }
};

