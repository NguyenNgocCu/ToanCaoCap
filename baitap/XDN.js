// Common code for ruler-and-compass pages.
// Author: Ken Brakke, brakke@susqu.edu, https://facstaff.susqu.edu/brakke

  var chrome_flag = false; // Chrome doesn't do filltext
  
  // canvas size, pixels
  var height = 600; 
  var width  = 600; 
  var scale = 100;  // scale factor world-to-pixel
  var xtrans = 3;   // translation for origin
  var ytrans = 3;
  // canvas world bounds
  var xright = 3.0;
  var xleft = -3.0;
  var ytop = 3.0;
  var ybottom = -3.0;

  var point_radius = 0.025;
  var moving_point = null;
  var moving_pt_count = 0;
  var mouse_down_flag = false;
  var draw_stage = 100;
  
  // Point label offset choices
  //           N      NE      E     SE     S      SW      W     NW
  var offx = [-0.04,  0.05,  0.17,  0.05, -0.05, -0.15, -0.17, -0.13];
  var offy = [-0.06, -0.05,  0.05,  0.15,  0.17,  0.15,  0.05, -0.05];
  var N = 0;
  var NE = 1;
  var E = 2;
  var SE = 3;
  var S = 4;
  var SW = 5;
  var W = 6;
  var NW = 7;
  
  // Distance between two points
  function dist(pt,qt)
  { return Math.sqrt((pt.x-qt.x)*(pt.x-qt.x)+(pt.y-qt.y)*(pt.y-qt.y));
  }
  	
  // swap coordinates of points
  function swap(d,e)
  { var tx = d.x; d.x = e.x; e.x = tx; tx = d.y; d.y = e.y; e.y = tx; }
  
  // Calculations of intersections
  function line_line(a,b,p)
  {
    det = (a.x1-a.x2)*(b.y2-b.y1) - (a.y1-a.y2)*(b.x2-b.x1);
    if ( det == 0 ) { p.x = null; p.y = null; return; }
    lambda = ((b.x2-a.x2)*(b.y2-b.y1) - (b.x2-b.x1)*(b.y2-a.y2))/det;
    p.x = lambda*a.x1 + (1-lambda)*a.x2; 
    p.y = lambda*a.y1 + (1-lambda)*a.y2; 
  }

  function line_circle(a,c,p1,p2)  // a is line, c is circle
  {
    if ( Math.abs(a.y2-a.y1) < Math.abs(a.x2-a.x1) )
    {
      var m = (a.y2-a.y1)/(a.x2-a.x1);
      var b = a.y1 - m*a.x1;
      var bb = (c.x-m*b+c.y*m);
      discr = bb*bb - (1+m*m)*(c.x*c.x + b*b - 2*c.y*b + c.y*c.y - c.r*c.r);
      if ( discr < 0.0 ) { p1.x = null; p1.y = null; p2.x = null; p2.y = null; return; }
      p1.x = (bb + Math.sqrt(discr))/(1+m*m);
      p1.y = m*p1.x + b;
      p2.x = (bb - Math.sqrt(discr))/(1+m*m);
      p2.y = m*p2.x + b;
    }
    else
    {
      var m = (a.x2-a.x1)/(a.y2-a.y1);
      var b = a.x1 - m*a.y1;
      var bb = (c.y-m*b+c.x*m);
      discr = bb*bb - (1+m*m)*(c.y*c.y + b*b - 2*c.x*b + c.x*c.x - c.r*c.r);
      if ( discr < 0.0 ) { p1.x = null; p1.y = null; p2.x = null; p2.y = null; return; }
      p1.y = (bb + Math.sqrt(discr))/(1+m*m);
      p1.x = m*p1.y + b;
      p2.y = (bb - Math.sqrt(discr))/(1+m*m);
      p2.x = m*p2.y + b;
    }
  }

  function circle_circle(a,b,p1,p2)
  {
    var d = Math.sqrt((a.x-b.x)*(a.x-b.x) + (a.y-b.y)*(a.y-b.y));
    if ( (d==0) || (d > a.r+b.r) || (d < Math.abs(a.r-b.r)) ) { p1.x = null; p1.y = null; p2.x = null; p2.y = null; return; }
    var aa = (a.r*a.r - b.r*b.r + d*d)/2/d;
    var h = Math.sqrt(a.r*a.r - aa*aa);
    p1.x = a.x + aa/d*(b.x-a.x) + h/d*(b.y-a.y);
    p1.y = a.y + aa/d*(b.y-a.y) - h/d*(b.x-a.x);
    p2.x = a.x + aa/d*(b.x-a.x) - h/d*(b.y-a.y);
    p2.y = a.y + aa/d*(b.y-a.y) + h/d*(b.x-a.x);
      
  }    

  function perp_to_line(a,b,L)  // perp at point a; b is other point on line; L is output line
  {
    L.x1 = a.x; L.y1 = a.y;
    L.x2 = a.x + (b.y-a.y); L.y2 = a.y - (b.x-a.x);
  }

  function off_perp_to_line(a,LA,LB)  // perp through point a to line LA; LB is output
  { LB.x1 = a.x; LB.y1 = a.y;
    LB.x2 = a.x+(LA.y2-LA.y1);
    LB.y2 = a.y-(LA.x2-LA.x1);
  }

  function inversion(p,c,q)  // inversion of point p in circle c, result q
  { q.x = c.x + (p.x-c.x)*c.r*c.r/dist(p,c)/dist(p,c);
    q.y = c.y + (p.y-c.y)*c.r*c.r/dist(p,c)/dist(p,c);
  }
  
  function draw_point(pt,color,offset)
  {
    ctx.beginPath();
    ctx.strokeStyle=color;
	ctx.fillStyle=color;
    ctx.lineWidth = 0.03;
    ctx.arc(pt.x,pt.y,point_radius,0,2*Math.PI,true);
    ctx.fill();
	ctx.stroke();
	
	ctx.beginPath();
chrome_flag = false;
	if ( chrome_flag )
	{
      ctx.strokeStyle="black";
	  ctx.lineWidth = 0.005;
	  ctx.strokeText(pt.label,pt.x+offx[offset],pt.y+offy[offset]);		
	}
	else 
	{
	  ctx.fillStyle="black";
      ctx.fillText(pt.label,pt.x+offx[offset],pt.y+offy[offset]);
	}

	ctx.stroke();
  }


  function draw_p1(pt,color,offset)   // Vẽ điểm với độ đậm 0.003
  {
    ctx.beginPath();
    ctx.strokeStyle=color;
	ctx.fillStyle=color;
    ctx.lineWidth = 0.003;      // Vẽ điểm với độ đậm 0.003
    ctx.arc(pt.x,pt.y,point_radius,0,2*Math.PI,true);
    ctx.fill();
	ctx.stroke();
	
	ctx.beginPath();
chrome_flag = false;
	if ( chrome_flag )
	{
      ctx.strokeStyle="black";
	  ctx.lineWidth = 0.005;
	  ctx.strokeText(pt.label,pt.x+offx[offset],pt.y+offy[offset]);		
	}
	else 
	{
	  ctx.fillStyle="black";
      ctx.fillText(pt.label,pt.x+offx[offset],pt.y+offy[offset]);
	}

	ctx.stroke();
  }


  function DrawDottedLine(pt,qt,dotCount){
          var dx = qt.x-pt.x;
          var dy = qt.y-pt.y;
          var spaceX = dx/(dotCount-1);
          var spaceY = dy/(dotCount-1);
          var newX = pt.x;
          var newY = pt.y;
          var mm = new Object; mm.x = newX; mm.y = newY;
          for (var i=0; i < dotCount; i++){
                  draw_p1(mm,"black");
                  newX = newX + spaceX;
                  newY = newY + spaceY;  
                  mm.x = newX; 
                  mm.y = newY;            
           }
           ctx.stroke(); 
        }


  function draw_segment(pt,qt, color="black")
  {
    ctx.beginPath();
    ctx.strokeStyle=color;
    ctx.lineWidth = 0.02;
    ctx.moveTo(pt.x,pt.y);
    ctx.lineTo(qt.x,qt.y);
    ctx.stroke();
  }
  
  function draw_segmentWh(pt,qt, color="white")   // Để che các đoạn thẳng đã có trước
  {

 
 var ctx = canvas.getContext('2d');


    ctx.beginPath();
    ctx.strokeStyle=color;
  
    ctx.lineWidth = 0.05;
    ctx.moveTo(pt.x,pt.y);
    ctx.lineTo(qt.x,qt.y);
    ctx.stroke();
  }


 function draw_line(pt,qt) // to beyond boundaries of canvas; point-point version
 { var y_right;
   var y_left;
   var x_top;
   var x_left;
   var found = false;
   var lambda1;
   var lambda2;
   lambda_high = 1e10;
   lambda_low = -1e10;
   if ( qt.x != pt.x )
   { lambda_right = (xright - pt.x)/(qt.x-pt.x);
     lambda_left = (xleft - pt.x)/(qt.x-pt.x); 
	 if ( lambda_right > lambda_left ) { lambda_high = lambda_right; lambda_low = lambda_left;}
	 else { lambda_high = lambda_left; lambda_low = lambda_right;}
   }
   if ( qt.y != pt.y )
   { lambda_top = (ytop - pt.y)/(qt.y-pt.y);
     x_top = lambda_top*pt.x + (1-lambda_top)*qt.x;
     if ( x_top > xleft && x_top < xright ) { if ( found ) lambda2 = lambda_top; else {lambda1 = lambda_top; found=true; }}
     lambda_bottom = (ybottom - pt.y)/(qt.y-pt.y);
     x_bottom = lambda_bottom*pt.x + (1-lambda_bottom)*qt.x;
     if ( x_bottom > xleft && x_bottom < xright ) { if ( found ) lambda2 = lambda_top; else {lambda1 = lambda_top; found=true; }}
	 
	 if ( lambda_top > lambda_bottom )
	 { if ( lambda_top < lambda_high ) lambda_high = lambda_top;
       if ( lambda_bottom > lambda_low ) lambda_low = lambda_bottom;
	 }
	 else
	 { if ( lambda_bottom < lambda_high ) lambda_high = lambda_bottom;
       if ( lambda_top > lambda_low ) lambda_low = lambda_top;
	 }
		 
   }
   if ( lambda_high < lambda_low ) return;
   
   ctx.beginPath();
   ctx.strokeStyle="black";
   ctx.lineWidth = 0.02;
   ctx.moveTo(pt.x+lambda_high*(qt.x-pt.x),pt.y+lambda_high*(qt.y-pt.y));
   ctx.lineTo(pt.x+lambda_low*(qt.x-pt.x),pt.y+lambda_low*(qt.y-pt.y));
   ctx.stroke();
 }


 function draw_line_L(L) // to beyond boundaries of canvas. Line object version
 {
   lambda_high = 1e10;
   lambda_low = -1e10;
   if ( L.x2 != L.x1 )
   { lambda_right = (xright - L.x1)/(L.x2-L.x1);
     if ( lambda_right >= 0 && lambda_right < lambda_high ) lambda_high = lambda_right;
     if ( lambda_right <= 0 && lambda_right > lambda_low ) lambda_low = lambda_right;
     lambda_left = (xleft - L.x1)/(L.x2-L.x1);
     if ( lambda_left >= 0 && lambda_left < lambda_high ) lambda_high = lambda_left;
     if ( lambda_left <= 0 && lambda_left > lambda_low ) lambda_low = lambda_left;
   }
   if ( L.y2 != L.y1 )
   { lambda_top = (ytop - L.y1)/(L.y2-L.y1);
     if ( lambda_top >= 0 && lambda_top < lambda_high ) lambda_high = lambda_top;
     if ( lambda_top <= 0 && lambda_top > lambda_low ) lambda_low = lambda_top;
     lambda_bottom = (ybottom - L.y1)/(L.y2-L.y1);
     if ( lambda_bottom >= 0 && lambda_bottom < lambda_high ) lambda_high = lambda_bottom;
     if ( lambda_bottom <= 0 && lambda_bottom > lambda_low ) lambda_low = lambda_bottom;
   }
   ctx.beginPath();
   ctx.strokeStyle="black";
   ctx.lineWidth = 0.02;
   ctx.moveTo(L.x1+lambda_high*(L.x2-L.x1),L.y1+lambda_high*(L.y2-L.y1));
   ctx.lineTo(L.x1+lambda_low*(L.x2-L.x1),L.y1+lambda_low*(L.y2-L.y1));
   ctx.stroke();
 }

  function draw_ray(pt,qt) // to beyond boundaries of canvas, pt is tail
  {found = false;
   lambda_high = 1e10;
   lambda_low = -1e10;
   if ( qt.x != pt.x )
   { lambda_right = (xright - pt.x)/(qt.x-pt.x);
     lambda_left = (xleft - pt.x)/(qt.x-pt.x); 
	 if ( lambda_right > lambda_left ) { lambda_high = lambda_right; lambda_low = lambda_left;}
	 else { lambda_high = lambda_left; lambda_low = lambda_right;}
   }
   if ( qt.y != pt.y )
   { lambda_top = (ytop - pt.y)/(qt.y-pt.y);
     x_top = lambda_top*pt.x + (1-lambda_top)*qt.x;
     if ( x_top > xleft && x_top < xright ) { if ( found ) lambda2 = lambda_top; else {lambda1 = lambda_top; found=true; }}
     lambda_bottom = (ybottom - pt.y)/(qt.y-pt.y);
     x_bottom = lambda_bottom*pt.x + (1-lambda_bottom)*qt.x;
     if ( x_bottom > xleft && x_bottom < xright ) { if ( found ) lambda2 = lambda_top; else {lambda1 = lambda_top; found=true; }}
	 
	 if ( lambda_top > lambda_bottom )
	 { if ( lambda_top < lambda_high ) lambda_high = lambda_top;
       if ( lambda_bottom > lambda_low ) lambda_low = lambda_bottom;
	 }
	 else
	 { if ( lambda_bottom < lambda_high ) lambda_high = lambda_bottom;
       if ( lambda_top > lambda_low ) lambda_low = lambda_top;
	 }
		 
   }

   if ( lambda_low < 0.0 ) lambda_low = 0.0;
   if ( lambda_high < lambda_low ) return;

    ctx.beginPath();
    ctx.strokeStyle="black";
    ctx.lineWidth = 0.02;
    ctx.moveTo(pt.x+lambda_high*(qt.x-pt.x),pt.y+lambda_high*(qt.y-pt.y));
    ctx.lineTo(pt.x,pt.y);
    ctx.stroke();
  }

  function draw_arc(pt,radius,start_angle,end_angle)
  {
    ctx.beginPath();
    ctx.strokeStyle="black";
    ctx.lineWidth = 0.02;
    ctx.moveTo(pt.x+radius*Math.cos(start_angle),pt.y+radius*Math.sin(start_angle));
    ctx.arc(pt.x,pt.y,radius,start_angle,end_angle,false);
    ctx.stroke();
  }

  function draw_arc_color(pt,radius,start_angle,end_angle,c)
  {
    ctx.beginPath();
    ctx.strokeStyle=c;
    ctx.lineWidth = 0.02;
    ctx.moveTo(pt.x+radius*Math.cos(start_angle),pt.y+radius*Math.sin(start_angle));
    ctx.arc(pt.x,pt.y,radius,start_angle,end_angle,false);
    ctx.stroke();
  }


  function DrawDotted_Arc(pt,bankinh,p1,p2,dotCount){
         // var dx = qt.x-pt.x;
        //  var dy = qt.y-pt.y;
          var space = (p2-p1)/(dotCount-1);
         // var spaceY = dy/(dotCount-1);
          var pN = p1
         // var pN = pt.x+radius*Math.cos(p1);
         // var newY = pt.y+radius*Math.sin(p1);
          var mm = new Object; mm.x = pt.x+bankinh*Math.cos(p1); mm.y = pt.y+bankinh*Math.sin(p1);
          for (var i=0; i < dotCount; i++){
                  draw_p1(mm,"black");
                  pN = pN + space;
                  mm.x=pt.x+bankinh*Math.cos(pN);
                  mm.y=pt.y+bankinh*Math.sin(pN);
                 // newY = newY + spaceY;  
                 // mm.x = newX; 
                 // mm.y = newY;            
           }
           ctx.stroke(); 
        }


  function Dtron(pt1,pt2,pt3)
  {

    var m1 = new Object;
    var m2 = new Object;
    var ta = new Object; ta.x = 0.0; ta.y = 0.0 ; ta.label = " "; // để trống tên của tâm d tròn
    //var dt1 = new Object; dt1.x1 = pt1.x; dt1.y1 = pt1.y; dt1.x2 = pt2.x; dt1.y2 = pt2.y;
var td1 = new Object; td1.x = (pt1.x+pt2.x)/2;  td1.y = (pt1.y+pt2.y)/2;
perp_to_line(td1,pt1,m1);

//var dt2 = new Object; dt2.x1 = pt1.x; dt2.y1 = pt1.y; dt2.x2 = pt3.x; dt2.y2 = pt3.y;
var td2 = new Object; td2.x = (pt1.x+pt3.x)/2;  td2.y = (pt1.y+pt3.y)/2;
perp_to_line(td2,pt1,m2);
  

line_line(m1,m2,ta);
draw_point(ta,"black",N);

var bk = dist(ta,pt1);
          draw_arc(ta,bk,0,2*3.14);
           ctx.stroke(); t=ta;
        }

        function DtronColor(pt1,pt2,pt3)
  {

    var m1 = new Object;
    var m2 = new Object;
    var ta = new Object; ta.x = 0.0; ta.y = 0.0 ; ta.label = " "; // để trống tên của tâm d tròn
    //var dt1 = new Object; dt1.x1 = pt1.x; dt1.y1 = pt1.y; dt1.x2 = pt2.x; dt1.y2 = pt2.y;
var td1 = new Object; td1.x = (pt1.x+pt2.x)/2;  td1.y = (pt1.y+pt2.y)/2;
perp_to_line(td1,pt1,m1);

//var dt2 = new Object; dt2.x1 = pt1.x; dt2.y1 = pt1.y; dt2.x2 = pt3.x; dt2.y2 = pt3.y;
var td2 = new Object; td2.x = (pt1.x+pt3.x)/2;  td2.y = (pt1.y+pt3.y)/2;
perp_to_line(td2,pt1,m2);
  

line_line(m1,m2,ta);
draw_point(ta,"black",N);

var bk = dist(ta,pt1);
          draw_arc_color(ta,bk,0,2*3.14,"red");
           ctx.stroke(); t=ta;
        }

        function DtronColorWhite(pt1,pt2,pt3)
  {

    var m1 = new Object;
    var m2 = new Object;
    var ta = new Object; ta.x = 0.0; ta.y = 0.0 ; ta.label = " "; // để trống tên của tâm d tròn
    //var dt1 = new Object; dt1.x1 = pt1.x; dt1.y1 = pt1.y; dt1.x2 = pt2.x; dt1.y2 = pt2.y;
var td1 = new Object; td1.x = (pt1.x+pt2.x)/2;  td1.y = (pt1.y+pt2.y)/2;
perp_to_line(td1,pt1,m1);

//var dt2 = new Object; dt2.x1 = pt1.x; dt2.y1 = pt1.y; dt2.x2 = pt3.x; dt2.y2 = pt3.y;
var td2 = new Object; td2.x = (pt1.x+pt3.x)/2;  td2.y = (pt1.y+pt3.y)/2;
perp_to_line(td2,pt1,m2);
  

line_line(m1,m2,ta);
draw_point(ta,"white",N);

var bk = dist(ta,pt1);
          draw_arc_color(ta,bk,0,2*3.14,"white");
           ctx.stroke(); t=ta;
        }



  function ddraw(stage) { draw_stage = stage; draw(); }
  
/*****************************************************************************************************/

  function handleMouseDown(event)
  {
    var rect = canvas.getBoundingClientRect();
    if ( event.button == 0 ) // left button
    {
	  // Translate to world coordinates
      var x = (event.clientX-rect.left)/scale - xtrans;
      var y = (event.clientY-rect.top)/scale - ytrans;

	  // see if mouse is sufficiently near one of the movable points
	  moving_point = null;
	  for ( var n = 0 ; n < movable_pts.length ; n++ )
	  { if ( (x-movable_pts[n].x)*(x-movable_pts[n].x) + (y-movable_pts[n].y)*(y-movable_pts[n].y) < 2*point_radius*point_radius )
		  { moving_point = movable_pts[n];
	        mouse_down_flag = true;
	        break;
		  }	  
	  }
     
    }
    else if ( event.button == 2 )  // right button
    {
    }
  }
/*****************************************************************************************************/

 function handleMouseUp(event)
 {
   mouse_down_flag = false;
 }
/*************************************************************************************************/

  function handleMouseMove(event)   // event.target is the canvas.
  {

    if (!mouse_down_flag || moving_point==null)
    {
      return;
    }

    var rect = canvas.getBoundingClientRect();
	
	// Translate to world coordinates
    moving_point.x = (event.clientX-rect.left)/scale - xtrans;
    moving_point.y = (event.clientY-rect.top)/scale - ytrans;

 
    draw();
 }
