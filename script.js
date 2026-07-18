const firebaseConfig = {
            apiKey: "AIzaSyDQ_myzq62wP3_xjy7V0tn_N04soA-Nkk0",
            authDomain: "jjtt-9c2de.firebaseapp.com",
            projectId: "jjtt-9c2de",
            storageBucket: "jjtt-9c2de.firebasestorage.app",
            messagingSenderId: "718171268915",
            appId: "1:718171268915:web:a9c1bf3fd63480920f0046",
            measurementId: "G-KDRMVDWFSN"
        };
        firebase.initializeApp(firebaseConfig);
        const db = firebase.firestore();

        // ========== 日记功能 ==========
        function displayDiary(keyword) {
    // 1. 先确保旧的容器被彻底销毁
    let oldContainer = document.getElementById('entries');
    if (oldContainer) {
        let newContainer = oldContainer.cloneNode(false); // 克隆一个干干净净的空壳
        oldContainer.parentNode.replaceChild(newContainer, oldContainer); // 用空壳替换掉旧的
    }

    // 2. 重新获取最新的干净容器
    let container = document.getElementById('entries');
    // 万一上面替换后 id 丢失，手动补上
    if (!container) {
        container = oldContainer;
    }
    container.innerHTML = '';

    // 3. 加载数据
    let query = db.collection('entries').orderBy('createdAt', 'desc');

    query.get()
      .then((querySnapshot) => {
        let allDocs = [];
        querySnapshot.forEach((doc) => {
            allDocs.push({ id: doc.id, data: doc.data() });
        });

        if (keyword && keyword.trim() !== '') {
            let kw = keyword.trim().toLowerCase();
            allDocs = allDocs.filter(doc => doc.data.content.toLowerCase().includes(kw));
        }

        window.diaryDates = new Set();
        allDocs.forEach(doc => {
            if (doc.data.createdAt) {
                let date = doc.data.createdAt.toDate();
                let dateStr = date.getFullYear() + '-' +
                              String(date.getMonth() + 1).padStart(2, '0') + '-' +
                              String(date.getDate()).padStart(2, '0');
                window.diaryDates.add(dateStr);
            }
        });
        renderCalendar();

        // 用 DocumentFragment 一次性渲染，只写一次 DOM，避免重复
        let fragment = document.createDocumentFragment();
        allDocs.forEach(doc => {
            let data = doc.data;
            let entryDiv = document.createElement('div');
            entryDiv.className = 'diary-entry';
            entryDiv.innerHTML = `
                <strong>${data.time}</strong>
                <span style="float: right; cursor: pointer; color: #ccc; font-size: 18px;"
                      onclick="deleteEntry('${doc.id}')">🗑️</span>
                <br>${data.content}
            `;
            fragment.appendChild(entryDiv);
        });

        container.appendChild(fragment);

        if (allDocs.length === 0) {
            container.innerHTML = '<p style="text-align:center;color:#999;">没有找到日记</p>';
        }
      }).catch((error) => {
        container.innerHTML = '加载失败了：' + error.message;
      });
}
       function searchDiary() {
    let keyword = document.getElementById('searchInput').value;
    displayDiary(keyword);
}

// 当前显示的年月
let calendarYear = new Date().getFullYear();
let calendarMonth = new Date().getMonth() + 1;

function renderCalendar() {
    let container = document.getElementById('calendar');
    let monthSpan = document.getElementById('currentMonth');

    monthSpan.innerText = calendarYear + '年 ' + calendarMonth + '月';

    let firstDay = new Date(calendarYear, calendarMonth - 1, 1).getDay(); // 本月第一天是星期几
    let daysInMonth = new Date(calendarYear, calendarMonth, 0).getDate(); // 本月有多少天

    let html = '';

    // 填充前面的空白
    for (let i = 0; i < firstDay; i++) {
        html += '<div></div>';
    }

    // 填充日期
    for (let day = 1; day <= daysInMonth; day++) {
        let dateStr = calendarYear + '-' +
                      String(calendarMonth).padStart(2, '0') + '-' +
                      String(day).padStart(2, '0');
        let hasDiary = window.diaryDates && window.diaryDates.has(dateStr);
        let style = hasDiary ?
                    'background: #7a9f43; color: white; border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; margin: 0 auto;' :
                    '';
        html += '<div style="' + style + '">' + day + '</div>';
    }

    container.innerHTML = html;
}

function changeMonth(delta) {
    calendarMonth += delta;
    if (calendarMonth > 12) {
        calendarMonth = 1;
        calendarYear++;
    }
    if (calendarMonth < 1) {
        calendarMonth = 12;
        calendarYear--;
    }
    // 重新加载日记，日历会自动更新
    let keyword = document.getElementById('searchInput').value;
    displayDiary(keyword);
}

        function addEntry() {
            let text = document.getElementById('newEntry').value;
            if (text.trim() === '') { alert('铁子，写点啥呗！'); return; }
            let now = new Date();
            let timeStr = now.toLocaleString('zh-CN');
            db.collection('entries').add({
                content: text,
                time: timeStr,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            }).then(() => {
                displayDiary();
                document.getElementById('newEntry').value = '';
            }).catch((error) => { alert('存失败了：' + error.message); });
        }

        function deleteEntry(docId) {
            if (confirm('确定要删除这条日记吗？')) {
                db.collection('entries').doc(docId).delete()
                  .then(() => { displayDiary(); })
                  .catch((error) => { alert('删除失败：' + error.message); });
            }
        }

        function clearDiary() {
            if (confirm('铁子，确定要把所有日记都删掉吗？')) {
                db.collection('entries').get().then((querySnapshot) => {
                    let batch = db.batch();
                    querySnapshot.forEach((doc) => { batch.delete(doc.ref); });
                    return batch.commit();
                }).then(() => { displayDiary(); })
                  .catch((error) => { alert('删除失败：' + error.message); });
            }
        }

        // ========== 照片功能 ==========
        function uploadBirdPhoto(bird) {
    let fileInput = document.getElementById(bird + 'File');
    let file = fileInput.files[0];
    if (!file) {
        alert('请先选一张照片');
        return;
    }

    // 用 canvas 压缩照片
    let reader = new FileReader();
    reader.onload = function(e) {
        let img = new Image();
        img.onload = function() {
            // 创建 canvas，把图片缩小
            let canvas = document.createElement('canvas');
            let maxSize = 400; // 最大宽度或高度 400px
            let width = img.width;
            let height = img.height;

            if (width > height) {
                if (width > maxSize) {
                    height = height * (maxSize / width);
                    width = maxSize;
                }
            } else {
                if (height > maxSize) {
                    width = width * (maxSize / height);
                    height = maxSize;
                }
            }

            canvas.width = width;
            canvas.height = height;
            let ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            // 压缩成 JPEG，质量 0.6（越小越压）
            let base64 = canvas.toDataURL('image/jpeg', 0.6);

            // 存到 Firestore
            db.collection('birdPhotos').add({
                bird: bird,
                photoData: base64,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            }).then(() => {
                loadBirdPhoto(bird);
            }).catch((error) => {
                alert('上传失败：' + error.message);
            });
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

        function loadBirdPhoto(bird) {
            let container = document.getElementById(bird + 'Photo');
            db.collection('birdPhotos')
              .where('bird', '==', bird)
              .orderBy('createdAt', 'desc')
              .limit(1)
              .get()
              .then((querySnapshot) => {
                if (querySnapshot.empty) {
                    container.innerHTML = '<span class="placeholder-text">' + (bird === 'jayjay' ? 'Jay Jay' : '桃桃') + '</span>';
                } else {
                    querySnapshot.forEach((doc) => {
                        let data = doc.data();
                        container.innerHTML = '<img src="' + data.photoData + '" style="width:100%;height:100%;object-fit:cover;">';
                    });
                }
              }).catch((error) => { container.innerHTML = '<span style="color:red;">加载失败</span>'; });
        }

        function deleteBirdPhoto(bird) {
            if (confirm('确定要删除' + (bird === 'jayjay' ? 'Jay Jay' : '桃桃') + '的照片吗？')) {
                db.collection('birdPhotos').where('bird', '==', bird).get()
                  .then((querySnapshot) => {
                    let batch = db.batch();
                    querySnapshot.forEach((doc) => { batch.delete(doc.ref); });
                    return batch.commit();
                  }).then(() => { loadBirdPhoto(bird); })
                  .catch((error) => { alert('删除失败：' + error.message); });
            }
        }

        // ========== 页面加载 ==========
        calendarYear = new Date().getFullYear();
        calendarMonth = new Date().getMonth() + 1;
        displayDiary();
        loadBirdPhoto('jayjay');
        loadBirdPhoto('taotao');
