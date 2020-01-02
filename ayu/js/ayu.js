$(document).ready(function(e) {

    var clientWidth = document.body.clientWidth;
    var clientHeight = document.body.clientHeight;

    // 做适配
    // 控制显示比例 
    var viewport = document.querySelector("meta[name=viewport]");
    var winWidths = $(window).width();
    // var densityDpi = 600 / winWidths;

    // var height = document.body.clientHeight;
    // var width = document.body.clientWidth;

    var height_width = 1920 / 1080;

    if (clientHeight / clientWidth != height_width) {

        if (clientHeight < clientWidth) {
            viewport.setAttribute('content', 'width=' + clientHeight / height_width + ',initial-scale=1, minimum-scale=1, maximum-scale=1,user-scalable=no')
            document.getElementsByTagName("body")[0].style.width = clientHeight / height_width + 'px';
        } else {
            var new_height = clientWidth * height_width;
            if (new_height > clientHeight) {
                clientWidth = clientHeight / height_width;
                new_height = clientWidth * height_width;
                
            }

            viewport.setAttribute('content', 'width=' + clientWidth + ',initial-scale=1, minimum-scale=1, maximum-scale=1,user-scalable=no')
            document.getElementById("container").style.width = clientWidth + 'px';
            document.getElementById("container").style.height = new_height + 'px';
        }
        
        // 设置字体
        $('#word').css('font-size', ($(".container").width() * 0.036) + 'px');
        $('.name').css('font-size', ($(".container").width() * 0.025) + 'px');
        $('body').css('font-size', ($(".container").width() * 0.038) + 'px');
    }

    // var bolloon = $('#balloon');
    // var cloud0 = $('#cloud0');
    // var cloud1 = $('#cloud1');
    // var cloud2 = $('#cloud2');
    var bolloon = document.getElementById('balloon');
    var cloud0 = document.getElementById('cloud0');
    var cloud1 = document.getElementById('cloud1');
    var cloud2 = document.getElementById('cloud2');


    var cloud0Flag = 0;
    var cloud1Flag = 1;
    var cloud2Flag = 0;
    
    // 气球飘动
    function balloonFloat() {
        var left_pixel = balloon.offsetLeft;
        left_pixel += 1;

        bolloon.style.left = left_pixel + "px";

        if(left_pixel > clientWidth) {

            bolloon.style.left = (-balloon.clientWidth) + "px";

        }
    }

    // 云飘动
    function cloud0Float() {
        var left_pixel = cloud0.offsetLeft;

        if(cloud0Flag == 0) {
            left_pixel += 1;
        } else {
            left_pixel -= 1;
        }
        cloud0.style.left = left_pixel + "px";

        if (left_pixel > clientWidth - cloud0.clientWidth) {
            cloud0Flag = 1;
        }

        if(left_pixel < 0) {
            cloud0Flag = 0;
        }
    }

    function cloud1Float() {
        var left_pixel = cloud1.offsetLeft;
        if (cloud1Flag == 0) {
            left_pixel += 1;
        } else {
            left_pixel -= 1;
        }
        cloud1.style.left = left_pixel + "px";

        if (left_pixel > clientWidth - cloud1.clientWidth) {
            cloud1Flag = 1;
        }

        if (left_pixel < 0) {
            cloud1Flag = 0;
        }
    }
    function cloud2Float() {
        var left_pixel = cloud2.offsetLeft;
        if (cloud2Flag == 0) {
            left_pixel += 1;
        } else {
            left_pixel -= 1;
        }
        cloud2.style.left = left_pixel + "px";

        if (left_pixel > clientWidth - cloud2.clientWidth) {
            cloud2Flag = 1;
        }

        if (left_pixel < 0) {
            cloud2Flag = 0;
        }
    }

    setInterval(balloonFloat, 15);
    setInterval(cloud0Float, 50);
    setInterval(cloud1Float, 20);
    setInterval(cloud2Float, 40);




    // 转场动画
    var canvas = document.getElementById('iriswipe');
    var irisConf = {
        canvas:canvas,
        poses: {
            steps: [
                {x:50, y:50},
                {x:30, y:10}
            ]
        },
        speed: [15, 20]
    }
    
    var music = document.getElementById('music');
    $('#start').on('click', function (event) {
       console.log('start'); 
       if(music.paused) {
           music.play();
       }
       Iris.construct(irisConf);
       setTimeout(function() {
            $('#page0').hide();
       }, 200);
        setTimeout(function () {
            start();
        }, 800);
    });

    // 烟花
    for (var i = 0; i < 5; i++) {
        new Fireworks(document.getElementById('fireworks'), true).play();
    }

})

var sumTime = 0;
function start() {

    setTimeout(function () {
        $('#page1').show();
    }, sumTime += 1000);
    setTimeout(function () {
        $('#page1').removeClass("fadeInLeft");
        $('#page1').removeClass("animated");
        $(".vase").show();
    }, sumTime += 2500);
    setTimeout(function () {
        $('.vase').removeClass("fadeInLeft");
        $('.vase').removeClass("animated");
        $('.leaf').show();
    }, sumTime += 2000);
    setTimeout(function () {
        $('.leaf').removeClass("fadeInLeft");
        $('.leaf').removeClass("animated");
        $('.cage').show();
    }, sumTime += 2500);
    setTimeout(function () {
        $('.cage').removeClass("fadeInLeft");
        $('.cage').removeClass("animated");
        $('.bird1').show();
    }, sumTime += 1500);
    setTimeout(function () {
        $('.bird1').removeClass("fadeInLeft");
        $('.bird1').removeClass("animated");
        $('.leaf_bird2').show();
    }, sumTime += 2500);
    setTimeout(function () {
        $('.leaf_bird2').removeClass("fadeInLeft");
        $('.leaf_bird2').removeClass("animated");
        $('.bird2').show();
    }, sumTime += 1500);
    setTimeout(function () {
        $('.bird2').removeClass("fadeInLeft");
        $('.bird2').removeClass("animated");
        $('.top_hearts').show();
    }, sumTime += 1500);
    setTimeout(function () {
        $('.top_hearts').removeClass("fadeInLeft");
        $('.top_hearts').removeClass("animated");
        $('.bottom_hearts').show();
    }, sumTime += 800);
    setTimeout(function () {
        $('.bottom_hearts').removeClass("fadeInLeft");
        $('.bottom_hearts').removeClass("animated");
        dispaly();
    }, sumTime += 6600);

    var bird2TouchSum = 0;
    $(".bird2").on("touchstart", function (event) {
        bird2TouchSum ++;
        if (bird2TouchSum % 2 == 0) {
            if ($('#fireworks').is(":hidden")) {
                $('#fireworks').show();
            } else {
                $('#fireworks').hide();
            }
        }
    });

    //  
    // setTimeout(function () {
    //     console.log(dispalyTextTime);
    //     var bird1TouchSum = 0;
    //     $(".bird1").on("touchstart", function (event) {
    //         bird1TouchSum++;
    //         if (bird1TouchSum % 5 == 0) {
    //             $.dispalyText("  ████     唯愿岁月可回首██        且以深情共白头███");
    //             setTimeout(function () {
    //                 clearInterval(echo);
    //                 clearInterval(guang);
    //             }, 18000);
    //         }
    //     });

    //     var topHeartTouchSum = 0;
    //     $(".top_hearts").on("touchstart", function (event) {
    //         topHeartTouchSum++;
    //         if (topHeartTouchSum % 5 == 0) {
    //             $.dispalyText("  ████     你可知██       这世间所有流水桃花██        都美不过你隔花眺望而来的眼███");
    //             setTimeout(function () {
    //                 clearInterval(echo);
    //                 clearInterval(guang);
    //             }, 20000);
    //         }
    //     });

    //     var bottomHeartTouchSum = 0;
    //     $(".bottom_hearts").on("touchstart", function (event) {
    //         bottomHeartTouchSum++;
    //         if (bottomHeartTouchSum % 5 == 0) {
    //             $.dispalyText("  ████     人活着本来就没有什么意义██       但只有活下去██        才能找到有趣的事██       就像你找到了这朵花██       就像我找到了你███");
    //             setTimeout(function () {
    //                 clearInterval(echo);
    //                 clearInterval(guang);
    //             }, 28000);
    //         }
    //     });
    // }, sumTime + 2000);

}

function dispaly() {
    //文字
    var data = new Array();
    data.push("██          很抱歉没有鲜花,    也没有巧克力█       在最美的年华遇到你█         是上天给予我最大的幸运██        你就像一个天使█       降临到我荒芜且孤寂的内心█      自此照亮了我的世界██         你如同小王子星球上的那朵玫瑰█       为我绽放,    予我芬芳█      使我的生活充满色彩██ ");
    // data.push("██      因为你,     我爱上了这个世界 █      如果不曾遇到你█       我真不知道该怎么面对这物是人非██     和你在一起很开心,     也很快乐█       渐渐发现自己已经离不开你了█       有自卑,     无奈,     甚至......  恐惧██       有时候不禁在想█       如果失去你█     也许永远不会遇到另一个你 ██ ");
    data.push("██      因为你,     我爱上了这个世界 █      如果不曾遇到你█       我不知该怎么面对这物是人非██     和你在一起很开心,     也很快乐█       渐渐发现自己已经离不开你了█       有自卑,     无奈,     甚至......  恐惧██        有时候█       抓住幸福比忍耐痛苦█        真的更需要勇气 ██ ");

    data.push("██      生命总是有太多遗憾█      也许你说的很对█       人生从来就不该畏首畏尾██     我给不了你太多感动█       但我还是想陪在你身边█       从此便是一生██         虽然不知道未来在哪儿█      但我一定会尽自己最大的努力█   爱你,  保护你,  让你开心,   幸福██ ");
    data.push("███      以后,         我陪你,           好吗?    ███  To:      杜丰怡  ██  By:      向启怀 ██  二零一九年七月初七 ███");

    sumTime = 0;
    for (var i = 0; i < data.length; i++) {

        var time = 300 * data[i].length;
        setTimeout('$.dispalyText("' + data[i] + '");', sumTime);
        sumTime += time;
        setTimeout(function () {
            clearInterval(echo);
            clearInterval(guang);
        }, sumTime + 8000);
        // 最后一行不清除
        if (i != data.length - 1) {
            setTimeout(function () {
                $('#word').addClass('animated fadeOutRight');
            }, sumTime += 6000);
            setTimeout(function () {
                $("#txt").html("");
                $('#word').removeClass('animated');
                $('#word').removeClass('fadeOutRight');
            }, sumTime += 2000);
        }
    }

    return sumTime;
}

$.dispalyText = function (text) {
    //初始化
    $("#txt").html("");
    var guangs = ["　", "_", "　", "_"];
    var guangBiao = "/";
    var guangSub = 0;

    guang = setInterval("$.guang()", 120);

    var subs = 0;

    $.intent = function (str) {

        str = str.replace(eval("/█/gi"), "█");

        return str;
    }
    text = $.intent(text);

    echo = setInterval("$.echo()", 300);

    $.guang = function () {
        if (guangSub < guangs.length - 1) {
            guangSub++;
        } else {
            guangSub = 0;
        }
        guangBiao = guangs[guangSub];
        $("#guang").html(guangBiao);

    }

    $.echo = function () {
        if (subs < text.length) {
            $("#txt").html($("#txt").html() + $.repl(text.substr(subs, 1)));
            subs++;
        }
    }
    $.repl = function (str) {
        str = str.replace("\r\n", "<br/>");
        str = str.replace("\n", "<br/>");
        str = str.replace("█", "<br/>");
        return str;
    }
}
