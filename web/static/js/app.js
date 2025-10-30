// Open Tabs------------------------------------------------------------------------
function openPage(pageName, elmnt) {
    var i, tabcontent, tablinks;

    // Ẩn tất cả nội dung tab
    tabcontent = document.getElementsByClassName("tabcontent");
    for (i = 0; i < tabcontent.length; i++) {
        tabcontent[i].style.display = "none";
    }

    // Loại bỏ class 'active' khỏi tất cả các tab
    tablinks = document.getElementsByClassName("tablink");
    for (i = 0; i < tablinks.length; i++) {
        tablinks[i].classList.remove("active");
    }

    // Hiển thị nội dung tab được chọn
    var selectedTab = document.getElementById(pageName);
    if (selectedTab) {
        selectedTab.style.display = "block";
    }

    // Thêm class 'active' vào tab được chọn
    if (elmnt) {
        elmnt.classList.add("active");
    }
}

//Code class------------------------------------------------------------------------
class Button {
    constructor(idButton, ...buttonFunctions) {
        const xButton = document.getElementById(idButton);
        if (xButton) {
            buttonFunctions.forEach(func => xButton.addEventListener("click", func));
        } else {
            console.warn(`❗ Nút có id="${idButton}" không tồn tại.`);
        }
    }
}

class Key {
    constructor(idInput, pressedKey, ...keyFunctions) {
        const xKey = document.getElementById(idInput);
        if (xKey) {
            xKey.addEventListener("keydown", function (event) {
                if (event.key === pressedKey) {
                    keyFunctions.forEach(func => func());
                }
            });
        } else {
            console.warn(`❗ Input có id="${idInput}" không tồn tại.`);
        }
    }
}
//Code function--------------------------------------------------------------------
function removeImageKeyFrame() {
    const keyFrameContainer = document.getElementById("BLIP");
    const keyFrameElement = keyFrameContainer.querySelector("p");
    if (keyFrameElement) {
      keyFrameContainer.removeChild(keyFrameElement);
    }
  }

//Hàm search bằng BLIP
var imagesKeyFrame = [];
var buttonStates = [];
var imageKeyFrameSelected = [];
var imageId = [];
var gimageKeyFrame = '';

function search(idSearch) {
  var idSearch = document.getElementById(idSearch).value;
  const imageContainer = document.getElementById("image-container");
  while (imageContainer.firstChild) {
    imageContainer.removeChild(imageContainer.firstChild);
  }
  var serverUrl = 'http://127.0.0.1:8210/search';
  fetch(serverUrl, {
    method: 'POST',
    body: JSON.stringify({input: idSearch}),
    headers: {
      'Content-Type': 'application/json'
    }    
  })
  .then(response => response.json())
  .then(data => {
    data.image_files.forEach((image,index) => {
        removeImageKeyFrame();
        const imgElement = document.createElement("img");
        imgElement.src = `./static/${image}?q=0.5`;
        imgElement.classList.add("responsive-image");

        const imgContainer = document.createElement("div");
        imgContainer.classList.add("image-container");    
        imgContainer.appendChild(imgElement); 
        imageContainer.appendChild(imgContainer);
      });
  })
  .catch(error => console.error(error));
}



function clearSearch(idInputField) {
    const inputField = document.getElementById(idInputField);
    inputField.value = "";  
    // Xóa tất cả ảnh trong #image-container
    const imageContainer = document.getElementById("image-container");
    imageContainer.innerHTML = "";
}

// speech to text function------------------------------------------------------
function checkMicrophonePermission() {
    const hasPermission = localStorage.getItem('microphonePermission') === 'granted';
    if (hasPermission) {
      setupSpeechRecognition();
    } else {
      // Disable the microphone button initially.
      document.getElementById("voiceBLIPButton").disabled = true;
      requestMicrophoneAccess();
    }
}
  
function requestMicrophoneAccess() {
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then(function (stream) {
        setupSpeechRecognition();
        // Save microphone permission in Local Storage to avoid requesting again.
        localStorage.setItem('microphonePermission', 'granted');
        // Enable the microphone button.
        document.getElementById("voiceBLIPButton").disabled = false;
      })
      .catch(function (error) {
        console.error('Error when requesting microphone access:', error);
      });
  }
  
  
  function setupSpeechRecognition() {
    const voiceBLIPButton = document.getElementById("voiceBLIPButton");
    const inputBLIP = document.getElementById("inputBLIP");
    const recognition = new webkitSpeechRecognition();
  
    // Disable nút voiceBLIPButton trong lúc thu âm
    voiceBLIPButton.disabled = true;
    voiceBLIPButton.innerHTML = '<i class="fa fa-headphones" aria-hidden="true"></i>';
  
    recognition.onresult = function(event) {
      const transcript = event.results[0][0].transcript;
      inputBLIP.value = transcript;
      inputBLIP.focus();
  
      // Khi hoàn thành việc thu âm, bật lại nút voiceBLIPButton
      voiceBLIPButton.disabled = false;
      voiceBLIPButton.innerHTML = '<i class="fa fa-microphone" aria-hidden="true"></i>';
    };
  
    recognition.onend = function() {
      // Khi kết thúc thu âm (ngừng microphone), bật lại nút voiceBLIPButton
      voiceBLIPButton.disabled = false;
      voiceBLIPButton.innerHTML = '<i class="fa fa-microphone" aria-hidden="true"></i>';
    };
  
    recognition.start();
}
//---------------------------------------------------------------------------------
// Hàm khởi tạo khi tải trang
function init() {
    var defaultOpen = document.getElementById("defaultOpen");
    if (defaultOpen && defaultOpen.dataset.page) {
        openPage(defaultOpen.dataset.page, defaultOpen);
    }
}
//---------------------------------------------------------------------------------
// Chạy hàm khi tài liệu tải xong
document.addEventListener("DOMContentLoaded", function() {
    var tabButtons = document.getElementsByClassName("tablink");
    for (var i = 0; i < tabButtons.length; i++) {
        tabButtons[i].addEventListener("click", function() {
            openPage(this.dataset.page, this);
        });
    }
    init();

    //BLIP Button------------------------------------------------------------------------
    new Button("searchBLIPButton", () => {
        search("inputBLIP");
    });

    new Key("inputBLIP", "Enter", () => {
        search("inputBLIP");
    });

    new Button("voiceBLIPButton", () => {
        setupSpeechRecognition();
    });

    new Button("clearBLIPButton", () => {
        clearSearch("inputBLIP");
    });
});
