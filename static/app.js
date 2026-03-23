let token = localStorage.getItem('access_token');
let user = JSON.parse(localStorage.getItem('user_info') || '{}');
let classes = [], students = [], scores = [];
if (!token) window.location.href = '/';
document.getElementById('userInfo').textContent = '当前用户: ' + (user.username || '管理员');
let currentMode = 'single', currentSection = 'class';
const courses = ['语文','数学','英语','物理','历史','地理','生物','体育'];
const examTypes = ['期中考试','期末考试','单元测试','模拟考试','平时测验'];

function showSection(section, evt) {
    currentSection = section;
    document.querySelectorAll('.menu-item').forEach(i => i.classList.remove('active'));
    if (evt && evt.target) evt.target.classList.add('active');
    else {
        const items = document.querySelectorAll('.menu-item');
        if (section === 'class') items[0]?.classList.add('active');
        else if (section === 'student') items[1]?.classList.add('active');
        else items[2]?.classList.add('active');
    }
    if (section === 'class') loadClassSection();
    else if (section === 'student') loadStudentSection();
    else if (section === 'score') loadScoreSection();
}

function logout() { localStorage.removeItem('access_token'); localStorage.removeItem('user_info'); window.location.href = '/'; }

async function apiCall(url, method = 'GET', data = null) {
    const opts = { method, headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token } };
    if (data) opts.body = JSON.stringify(data);
    const res = await fetch('/api' + url, opts);
    if (res.status === 401) { logout(); return; }
    return res.json();
}

async function loadClasses() { classes = await apiCall('/class/') || []; }
async function loadStudents() { students = await apiCall('/student/') || []; }
async function loadScores() { scores = await apiCall('/score/') || []; }

function buildCourseOptions(sel = '') { return courses.map(c => `<option value="${c}" ${c === sel ? 'selected' : ''}>${c}</option>`).join(''); }
function buildExamTypeOptions(sel = '平时测验') { return examTypes.map(t => `<option value="${t}" ${t === sel ? 'selected' : ''}>${t}</option>`).join(''); }
function buildStudentOptions(f) {
    f = f.toLowerCase();
    return students.filter(s => s.name.toLowerCase().includes(f) || s.stu_no.toLowerCase().includes(f)).slice(0, 10).map(s => `<option value="${s.id}">${s.name} (${s.stu_no})</option>`).join('');
}
function changeInputMode(m) { currentMode = m; loadScoreSection(); }
function onStudentSearch() { document.getElementById('studentList').innerHTML = buildStudentOptions(document.getElementById('studentSearch').value.toLowerCase()); }
function showMessage(id, msg, type) { const el = document.getElementById(id); el.innerHTML = `<div class="message ${type}">${msg}</div>`; setTimeout(() => el.innerHTML = '', 3000); }

async function loadScoreSection() {
    await loadStudents(); await loadClasses();
    if (currentMode === 'single') {
        let html = `<div class="card"><div class="card-header">成绩录入</div>
            <div><label><input type="radio" name="inputMode" value="single" checked onchange="changeInputMode('single')"> 单个录入</label>
            <label><input type="radio" name="inputMode" value="batch" onchange="changeInputMode('batch')"> 批量录入</label></div>
            <div class="form-row"><div class="form-group"><label>学生</label>
                <input type="text" id="studentSearch" placeholder="输入姓名学号搜索" oninput="onStudentSearch()" list="studentList">
                <datalist id="studentList">${buildStudentOptions('')}</datalist></div>
                <div class="form-group"><label>课程</label><select id="courseName">${buildCourseOptions()}</select></div></div>
            <div class="form-row"><div class="form-group"><label>考试类型</label><select id="examType">${buildExamTypeOptions()}</select></div>
                <div class="form-group"><label>考试日期</label><input type="date" id="examDate"></div>
                <div class="form-group"><label>分数</label><input type="number" id="scoreValue" min="0" max="150"></div></div>
            <button class="btn btn-primary" onclick="addSingleScore()">添加成绩</button></div><div id="scoreMessage"></div>`;
        document.getElementById('mainContent').innerHTML = html;
    } else {
        let html = `<div class="card"><div class="card-header">成绩录入</div>
            <div><label><input type="radio" name="inputMode" value="single" onchange="changeInputMode('single')"> 单个录入</label>
            <label><input type="radio" name="inputMode" value="batch" checked onchange="changeInputMode('batch')"> 批量录入</label></div>
            <div class="form-row"><div class="form-group"><label>班级</label>
                <select id="batchClassSelect">${classes.map(c => `<option value="${c.id}">${c.class_name}</option>`).join('')}</select></div>
                <div class="form-group"><label>课程</label><select id="batchCourseName">${buildCourseOptions()}</select></div></div>
            <div class="form-row"><div class="form-group"><label>考试类型</label><select id="batchExamType">${buildExamTypeOptions()}</select></div>
                <div class="form-group"><label>考试日期</label><input type="date" id="batchExamDate"></div></div>
            <button class="btn btn-primary" onclick="generateBatchList()">生成花名册</button>
            <div id="batchScoreArea"><p style="color:#999;text-align:center;padding:20px;">请先点击生成花名册</p></div>
            <button class="btn btn-success hidden" id="batchSubmitBtn" onclick="submitBatchScores()">提交成绩</button></div><div id="scoreMessage"></div>`;
        document.getElementById('mainContent').innerHTML = html;
    }
    await loadScoreQuerySection();
}

async function addSingleScore() {
    const input = document.getElementById('studentSearch');
    const opt = Array.from(document.querySelectorAll('#studentList option')).find(o => o.value === input.value);
    const stuId = opt ? parseInt(opt.value) : null;
    if (!stuId) { showMessage('scoreMessage', '请选择学生', 'error'); return; }
    const cn = document.getElementById('courseName').value, et = document.getElementById('examType').value;
    const ed = document.getElementById('examDate').value, sv = parseFloat(document.getElementById('scoreValue').value);
    if (!cn || !ed || isNaN(sv)) { showMessage('scoreMessage', '请填写完整', 'error'); return; }
    const r = await apiCall('/score/', 'POST', { stu_id: stuId, course_name: cn, score: sv, exam_time: ed, exam_type: et });
    if (r && r.id) { showMessage('scoreMessage', '添加成功', 'success'); loadScoreSection(); }
    else showMessage('scoreMessage', r?.detail || '添加失败', 'error');
}

async function generateBatchList() {
    const cid = parseInt(document.getElementById('batchClassSelect').value);
    const cn = document.getElementById('batchCourseName').value;
    const et = document.getElementById('batchExamType').value;
    const ed = document.getElementById('batchExamDate').value;
    if (!cid) { showMessage('scoreMessage', '请选择班级', 'error'); return; }
    if (!cn) { showMessage('scoreMessage', '请选择课程', 'error'); return; }
    if (!et) { showMessage('scoreMessage', '请选择考试类型', 'error'); return; }
    if (!ed) { showMessage('scoreMessage', '请选择考试日期', 'error'); return; }
    await loadStudents();
    const filtered = students.filter(s => s.class_id === cid);
    if (!filtered.length) { showMessage('scoreMessage', '该班级无学生', 'error'); return; }
    const sc = classes.find(c => c.id === cid);
    let h = `<div style='position:sticky;top:0;z-index:100;background:#f5f5f5;padding:15px;margin-bottom:15px;border-radius:5px;border-left:4px solid #667eea;'>
        <p><strong>班级：</strong>${sc?.class_name || '-'}</p><p><strong>课程：</strong>${cn}</p>
        <p><strong>考试类型：</strong>${et}</p><p><strong>考试日期：</strong>${ed}</p></div>`;
    h += '<table><tr><th>学号</th><th>姓名</th><th>分数</th></tr>';
    filtered.forEach(s => { h += `<tr><td>${s.stu_no}</td><td>${s.name}</td><td><input type='number' min='0' max='150' style='width:80px' class='score-input' data-stu-id='${s.id}'></td></tr>`; });
    h += '</table><p style="color:#666;margin-top:10px">提示：留空的学生将不提交成绩</p>';
    document.getElementById('batchScoreArea').innerHTML = h;
    document.getElementById('batchSubmitBtn').classList.remove('hidden');
}

async function submitBatchScores() {
    const cn = document.getElementById('batchCourseName').value;
    const et = document.getElementById('batchExamType').value;
    const ed = document.getElementById('batchExamDate').value;
    const inputs = document.querySelectorAll('.score-input');
    const data = [];
    inputs.forEach(i => { const v = i.value.trim(); if (v) { const n = parseFloat(v); if (!isNaN(n) && n >= 0 && n <= 150) data.push({ stu_id: parseInt(i.dataset.stuId), course_name: cn, score: n, exam_time: ed, exam_type: et }); } });
    if (!data.length) { showMessage('scoreMessage', '请填写分数', 'error'); return; }
    const r = await apiCall('/score/batch', 'POST', data);
    if (r && Array.isArray(r)) { showMessage('scoreMessage', `成功提交 ${r.length} 条`, 'success'); setTimeout(() => loadScoreSection(), 1500); }
    else showMessage('scoreMessage', r?.detail || '提交失败', 'error');
}

async function loadScoreQuerySection() {
    await loadScores();
    let h = '<div class="card"><div class="card-header">成绩查询</div><div class="form-row">';
    h += '<div class="form-group"><label>班级</label><select id="queryClass"><option value="">全部</option>';
    classes.forEach(c => h += `<option value="${c.id}">${c.class_name}</option>`);
    h += '</select></div><div class="form-group"><label>课程</label><select id="queryCourse"><option value="">全部</option>';
    courses.forEach(c => h += `<option value="${c}">${c}</option>`);
    h += '</select></div><div class="form-group"><label>考试类型</label><select id="queryExamType"><option value="">全部</option>';
    examTypes.forEach(t => h += `<option value="${t}">${t}</option>`);
    h += '</select></div><div class="form-group"><label>学生姓名</label><input type="text" id="queryStudentName" placeholder="输入姓名"></div>';
    h += '</div><button class="btn btn-primary" onclick="queryScores()">查询</button></div><div id="queryResult" style="margin-top:20px"></div>';
    document.getElementById('mainContent').innerHTML += h;
}

async function queryScores() {
    const cid = document.getElementById('queryClass').value, cn = document.getElementById('queryCourse').value;
    const et = document.getElementById('queryExamType').value, sn = document.getElementById('queryStudentName').value;
    await loadScores(); await loadStudents();
    let filtered = scores;
    if (cid) { const cs = students.filter(s => s.class_id === parseInt(cid)).map(s => s.id); filtered = filtered.filter(sc => cs.includes(sc.stu_id)); }
    if (cn) filtered = filtered.filter(sc => sc.course_name === cn);
    if (et) filtered = filtered.filter(sc => sc.exam_type === et);
    if (sn) { const ms = students.filter(s => s.name.includes(sn)).map(s => s.id); filtered = filtered.filter(sc => ms.includes(sc.stu_id)); }
    let h = '<table><tr><th>学号</th><th>姓名</th><th>班级</th><th>课程</th><th>考试类型</th><th>分数</th><th>考试日期</th><th>操作</th></tr>';
    filtered.forEach(sc => {
        const stu = students.find(s => s.id === sc.stu_id);
        const cn = stu ? (classes.find(c => c.id === stu.class_id)?.class_name || '-') : '-';
        h += `<tr><td>${stu?.stu_no || '-'}</td><td>${stu?.name || '-'}</td><td>${cn}</td><td>${sc.course_name}</td>`;
        h += `<td>${sc.exam_type || '-'}</td><td id="score-cell-${sc.id}">${sc.score}</td><td>${sc.exam_time}</td>`;
        h += `<td class="action-btns"><button class="btn btn-success btn-sm" id="edit-btn-${sc.id}" onclick="editScore(${sc.id})">修改</button>`;
        h += ` <button class="btn btn-danger btn-sm" onclick="deleteScore(${sc.id})">删除</button></td></tr>`;
    });
    h += '</table>';
    if (!filtered.length) h = '<p style="color:#999;text-align:center;margin-top:20px">暂无记录</p>';
    document.getElementById('queryResult').innerHTML = h;
}

async function editScore(id) {
    const sc = scores.find(s => s.id === id); if (!sc) return;
    const cell = document.getElementById(`score-cell-${id}`), btn = document.getElementById(`edit-btn-${id}`);
    if (btn.textContent === '修改') {
        cell.innerHTML = `<input type="number" id="edit-input-${id}" value="${sc.score}" min="0" max="150" style="width:80px">`;
        btn.textContent = '保存'; btn.classList.replace('btn-success', 'btn-primary');
    } else {
        const v = parseFloat(document.getElementById(`edit-input-${id}`).value);
        if (isNaN(v) || v < 0 || v > 150) { alert('请输入有效分数'); return; }
        const r = await apiCall(`/score/${id}`, 'PUT', { stu_id: sc.stu_id, course_name: sc.course_name, score: v, exam_time: sc.exam_time, exam_type: sc.exam_type });
        if (r && r.id) { showMessage('scoreMessage', '修改成功', 'success'); queryScores(); }
        else alert(r?.detail || '修改失败');
    }
}

async function deleteScore(id) {
    if (!confirm('确定删除吗？')) return;
    const r = await apiCall(`/score/${id}`, 'DELETE');
    if (r && r.message) { showMessage('scoreMessage', '删除成功', 'success'); queryScores(); }
    else alert(r?.detail || '删除失败');
}

async function loadClassSection() {
    await loadClasses();
    let h = '<div class="card"><div class="card-header">添加班级</div><div class="form-row">';
    h += '<div class="form-group"><label>班级名称</label><input type="text" id="className"></div>';
    h += '<div class="form-group"><label>班主任</label><input type="text" id="classTeacher"></div></div>';
    h += '<button class="btn btn-primary" onclick="addClass()">添加</button></div>';
    h += '<div class="card"><div class="card-header">班级列表</div><div id="classMessage"></div>';
    h += '<table><tr><th>ID</th><th>班级名称</th><th>班主任</th><th>学生人数</th><th>操作</th></tr>';
    classes.forEach(c => {
        h += `<tr><td>${c.id}</td><td id="cn-${c.id}">${c.class_name}</td><td id="ct-${c.id}">${c.head_teacher}</td><td>${c.student_count}</td>`;
        h += `<td class="action-btns"><button class="btn btn-success btn-sm" id="ce-${c.id}" onclick="toggleClass(${c.id})">编辑</button>`;
        h += ` <button class="btn btn-danger btn-sm" onclick="deleteClass(${c.id})">删除</button></td></tr>`;
    });
    h += '</table></div>';
    document.getElementById('mainContent').innerHTML = h;
}

async function addClass() {
    const n = document.getElementById('className').value, t = document.getElementById('classTeacher').value;
    if (!n || !t) { showMessage('classMessage', '请填写完整', 'error'); return; }
    const r = await apiCall('/class/', 'POST', { class_name: n, head_teacher: t });
    if (r && r.id) { showMessage('classMessage', '添加成功', 'success'); loadClassSection(); }
    else showMessage('classMessage', r?.detail || '添加失败', 'error');
}

function toggleClass(id) {
    const cn = document.getElementById(`cn-${id}`), ct = document.getElementById(`ct-${id}`), btn = document.getElementById(`ce-${id}`);
    if (btn.textContent === '编辑') {
        cn.innerHTML = `<input type="text" id="ecn-${id}" value="${cn.textContent}" style="width:100%">`;
        ct.innerHTML = `<input type="text" id="ect-${id}" value="${ct.textContent}" style="width:100%">`;
        btn.textContent = '保存'; btn.classList.replace('btn-success', 'btn-primary');
    } else {
        const n = document.getElementById(`ecn-${id}`).value, t = document.getElementById(`ect-${id}`).value;
        if (!n || !t) { showMessage('classMessage', '不能为空', 'error'); return; }
        updateClass(id, n, t);
    }
}

async function updateClass(id, n, t) {
    const r = await apiCall(`/class/${id}`, 'PUT', { class_name: n, head_teacher: t });
    if (r && r.id) { showMessage('classMessage', '更新成功', 'success'); loadClassSection(); }
    else showMessage('classMessage', r?.detail || '更新失败', 'error');
}

async function deleteClass(id) {
    if (!confirm('确定删除？')) return;
    const r = await apiCall(`/class/${id}`, 'DELETE');
    if (r && r.message) loadClassSection();
    else showMessage('classMessage', r?.detail || '删除失败', 'error');
}

async function loadStudentSection() {
    await loadClasses(); await loadStudents();
    let h = '<div class="card"><div class="card-header">添加学生</div><div class="form-row">';
    h += '<div class="form-group"><label>学号</label><input type="text" id="studentNo"></div>';
    h += '<div class="form-group"><label>姓名</label><input type="text" id="studentName"></div></div>';
    h += '<div class="form-row"><div class="form-group"><label>性别</label><select id="studentGender">';
    h += '<option value="男" selected>男</option><option value="女">女</option></select></div>';
    h += '<div class="form-group"><label>出生日期</label><input type="date" id="studentBirthday"></div></div>';
    h += '<div class="form-row"><div class="form-group"><label>班级</label><select id="studentClass">';
    classes.forEach(c => h += `<option value="${c.id}">${c.class_name}</option>`);
    h += '</select></div><div class="form-group"><label>联系电话</label><input type="text" id="studentPhone"></div></div>';
    h += '<button class="btn btn-primary" onclick="addStudent()">添加</button></div>';
    h += '<div class="card"><div class="card-header">学生列表</div><div id="studentMessage"></div>';
    h += '<table><tr><th>ID</th><th>学号</th><th>姓名</th><th>性别</th><th>班级</th><th>联系电话</th><th>操作</th></tr>';
    students.forEach(s => {
        h += `<tr><td>${s.id}</td><td>${s.stu_no}</td><td id="sn-${s.id}">${s.name}</td>`;
        h += `<td id="sg-${s.id}">${s.gender}</td><td>${s.class_name || '-'}</td>`;
        h += `<td id="sp-${s.id}">${s.phone || '-'}</td>`;
        h += `<td class="action-btns"><button class="btn btn-success btn-sm" id="se-${s.id}" onclick="toggleStudent(${s.id})">编辑</button>`;
        h += ` <button class="btn btn-danger btn-sm" onclick="deleteStudent(${s.id})">删除</button></td></tr>`;
    });
    h += '</table></div>';
    document.getElementById('mainContent').innerHTML = h;
}

async function addStudent() {
    const no = document.getElementById('studentNo').value, nm = document.getElementById('studentName').value;
    const g = document.getElementById('studentGender').value, b = document.getElementById('studentBirthday').value;
    const ci = parseInt(document.getElementById('studentClass').value), ph = document.getElementById('studentPhone').value;
    if (!no || !nm) { showMessage('studentMessage', '学号和姓名必填', 'error'); return; }
    const r = await apiCall('/student/', 'POST', { stu_no: no, name: nm, gender: g, birthday: b, class_id: ci, phone: ph });
    if (r && r.id) { showMessage('studentMessage', '添加成功', 'success'); loadStudentSection(); }
    else showMessage('studentMessage', r?.detail || '添加失败', 'error');
}

function toggleStudent(id) {
    const s = students.find(x => x.id === id); if (!s) return;
    const sn = document.getElementById(`sn-${id}`), sg = document.getElementById(`sg-${id}`), sp = document.getElementById(`sp-${id}`);
    const btn = document.getElementById(`se-${id}`);
    if (btn.textContent === '编辑') {
        sn.innerHTML = `<input type="text" id="en-${id}" value="${s.name}" style="width:100%">`;
        sg.innerHTML = `<select id="eg-${id}" style="width:100%"><option value="男" ${s.gender === '男' ? 'selected' : ''}>男</option><option value="女" ${s.gender === '女' ? 'selected' : ''}>女</option></select>`;
        sp.innerHTML = `<input type="text" id="ep-${id}" value="${s.phone || ''}" style="width:100%">`;
        btn.textContent = '保存'; btn.classList.replace('btn-success', 'btn-primary');
    } else {
        const nn = document.getElementById(`en-${id}`).value, ng = document.getElementById(`eg-${id}`).value, np = document.getElementById(`ep-${id}`).value;
        if (!nn) { showMessage('studentMessage', '姓名不能为空', 'error'); return; }
        updateStudent(id, { stu_no: s.stu_no, name: nn, gender: ng, birthday: s.birthday, class_id: s.class_id, phone: np });
    }
}

async function updateStudent(id, d) {
    const r = await apiCall(`/student/${id}`, 'PUT', d);
    if (r && r.id) { showMessage('studentMessage', '更新成功', 'success'); loadStudentSection(); }
    else showMessage('studentMessage', r?.detail || '更新失败', 'error');
}

async function deleteStudent(id) {
    if (!confirm('确定删除？')) return;
    const r = await apiCall(`/student/${id}`, 'DELETE');
    if (r && r.message) loadStudentSection();
    else showMessage('studentMessage', r?.detail || '删除失败', 'error');
}

window.onload = function() { showSection(currentSection); };
