(function(){var b=document.getElementById("menuBtn"),n=document.getElementById("topnav");if(!b||!n)return;
function f(o){n.classList.toggle("ouvert",o);b.setAttribute("aria-expanded",o?"true":"false");}
b.addEventListener("click",function(){f(b.getAttribute("aria-expanded")!=="true");});
n.addEventListener("click",function(e){if(e.target.tagName==="A")f(false);});
document.addEventListener("keydown",function(e){if(e.key==="Escape")f(false);});
})();
