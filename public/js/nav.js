const navBar = document.querySelector(".menu");
const navToggle = document.querySelector(".mobile-nav-toggle");
const topic = document.querySelector(".topics");

navToggle.addEventListener("click", ()=>{
    const visibility = navBar.getAttribute("data-visible");
    if(visibility === "false"){
        navBar.setAttribute("data-visible", true);
        navToggle.setAttribute("area-expanded", true);
        navBar.classList.remove("h-class");
    }
    else if(visibility === "true"){
        navBar.setAttribute("data-visible", false);
        navToggle.setAttribute("area-expanded", false);
        navBar.classList.add("h-class");
        topic.classList.remove("tansition-topic");
    }
    // console.log(visibility);
})