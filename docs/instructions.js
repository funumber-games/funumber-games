(() => {
    const dialog = document.getElementById("instructionsDialog");
    const openButton = document.querySelector("[data-open-instructions]");
    const closeButton = document.querySelector("[data-close-instructions]");
    if (!dialog || !openButton || !closeButton) return;

    let previousFocus = null;

    function openInstructions() {
        previousFocus = document.activeElement;
        dialog.classList.remove("hidden");
        document.body.style.overflow = "hidden";
        closeButton.focus();
    }

    function closeInstructions() {
        dialog.classList.add("hidden");
        document.body.style.overflow = "";
        previousFocus?.focus();
    }

    openButton.addEventListener("click", openInstructions);
    closeButton.addEventListener("click", closeInstructions);
    dialog.addEventListener("click", event => {
        if (event.target === dialog) closeInstructions();
    });
    document.addEventListener("keydown", event => {
        if (event.key === "Escape" && !dialog.classList.contains("hidden")) closeInstructions();
    });
})();
