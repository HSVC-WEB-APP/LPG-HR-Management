/* ============================================================
   NHOM & DANH SACH NHAN SU (tab Nhom)
   LPGT Cavern — Quan ly Cong Ca v4
   ============================================================ */
/* =================== SETUP / ROSTER =================== */
function teamList(){
  const seen=[];activeEmps().forEach(e=>{const t=e.team||'';if(!seen.includes(t))seen.push(t);});
  return seen.sort((a,b)=>{if(a==='')return 1;if(b==='')return -1;return a.localeCompare(b,'vi',{numeric:true});});
}
/* ★ v9.6 — màn khai nhân sự nằm ở js/28-stdshift.js (Ca chuẩn theo nhóm).
   File này chỉ còn ba hàm SỬA dữ liệu mà màn ấy gọi lại: đổi một trường,
   đổi mã NV, xoá hẳn một dòng.

   Đã bỏ: addGroup / renameGroup / delGroup / addMember (nhóm nay là bốn cái
   cố định A·B·C·D + Office, không tạo/xoá nhóm nữa), updType và updPattern
   (kiểu ca là thuộc tính của NHÓM, mẫu ca tự khai chuyển sang khai ở ca
   thực tế — js/27-pattern.js). */
/* ★ v7.7 — mọi hàm SỬA nhân sự dưới đây đi qua hrGuard(): quản trị, quản lý
   người Hàn và THƯ KÝ đều làm được. Mật khẩu / phân quyền vẫn chốt bằng adm
   ở js/11-stats-data.js. */
function updEmp(id,f,v,rerender){
  if(!hrGuard())return;
  const e=empById(id);if(!e)return;
  e[f]=(f==='name'||f==='pos'||f==='team')?v.trim():v;
  save();
  if(rerender){renderSetup();renderBoth();}
  if(typeof renderAccTbl==='function')renderAccTbl();
}
function changeId(oldId,val){
  if(!hrGuard())return;
  const e=empById(oldId);if(!e)return;
  const nid=(val||'').trim();
  if(!nid){toast('Mã không được trống');renderSetup();return;}
  if(nid===oldId)return;
  if(S.employees.some(x=>x.id===nid)){toast('Mã đã tồn tại');renderSetup();return;}
  if(S.base[oldId]){S.base[nid]=S.base[oldId];delete S.base[oldId];}
  if(S.over[oldId]){S.over[nid]=S.over[oldId];delete S.over[oldId];}
  // Đơn đã gửi vẫn phải trỏ đúng người sau khi đổi mã
  Object.values(S.requests||{}).forEach(r=>{
    if(r.empId===oldId)r.empId=nid;
    if(r.withId===oldId)r.withId=nid;
    if(r.guarantorId===oldId)r.guarantorId=nid;
  });
  // Tài khoản: hash gắn với mã NV nên phải cấp lại, mật khẩu = mã NV mới
  if(S.accounts&&S.accounts[oldId])delete S.accounts[oldId];
  e.id=nid;
  /* ★ v9.7 — mã mới có thể từng bị xoá (đổi A→B rồi đổi ngược B→A). Bia mộ
     cũ của nó sẽ xoá sạch lịch và tài khoản vừa chuyển sang. Gỡ trước. */
  if(typeof tombLiftEmp==='function')tombLiftEmp(nid);
  ensureAccount(nid,true);
  save();renderSetup();renderBoth();
  toast(isRealEmpId(nid)?('Đã đổi mã NV — đăng nhập '+loginKey(nid)+', mật khẩu = '+loginKey(nid)):'Đã đổi mã NV');
}
/* ============================================================
   XOÁ HẲN MỘT NGƯỜI   ★ v9.7
   ------------------------------------------------------------
   Bản trước CHẶN xoá người đã có lịch hoặc đã có đơn, bắt dùng "Khai nghỉ
   việc" thay thế. Đúng cho người thật sự nghỉ việc — sai cho việc hay xảy
   ra hơn: một dòng KHAI SAI (nhập nhầm mã, trùng người, thử nghiệm) đã
   trót được tạo lịch, nay muốn xoá đi khai lại từ đầu. Khai nghỉ việc cho
   một dòng như thế là để rác lại trong bảng công vĩnh viễn.

   Nay xoá được, nhưng đi kèm ba điều kiện tự đặt cho mình:

   1. NÓI TRƯỚC MẤT GÌ. `empFootprint()` đếm đúng từng thứ — bao nhiêu ô ca
      chuẩn, bao nhiêu ô thực tế, bao nhiêu đơn (mấy cái đã duyệt), tài
      khoản, thông báo, buổi đào tạo — và câu hỏi xác nhận đọc ra bằng số.
   2. CÓ ĐƯỜNG LÙI. `empBackup()` tải về máy một file .json chứa trọn bản
      ghi của người ấy trước khi xoá. Firebase không có thùng rác; file này
      là thùng rác.
   3. KHÔNG ĐỂ LẠI MẢNH VỤN. Xoá cả đơn họ đứng tên, đơn họ đổi ca cùng,
      thông báo gửi cho họ, tên họ trong buổi đào tạo. Mảnh vụn trỏ tới một
      mã NV không còn ai là nguồn của mọi màn hình hiện ô trống về sau.
   ============================================================ */
/* Người này đang có những gì trong dữ liệu? Chỉ ĐẾM, không đụng gì. */
function empFootprint(id){
  const reqs=Object.values(S.requests||{}).filter(r=>r&&(r.empId===id||r.withId===id
                 ||r.byId===id||r.guarantorId===id||r.coverId===id));
  const notifs=Object.values(S.notifs||{}).filter(n=>n&&(n.to===id||n.by===id
                 ||n.from===id||n.empId===id));
  const trains=Object.values(S.trainings||{}).filter(x=>x&&Array.isArray(x.emps)
                 &&x.emps.indexOf(id)>=0);
  return {
    base  :Object.keys(S.base[id]||{}).length,
    over  :Object.keys(S.over[id]||{}).length,
    reqs  :reqs.length,
    reqsOk:reqs.filter(r=>r.status==='approved').length,
    acc   :!!(S.accounts&&S.accounts[id]),
    notifs:notifs.length,
    trains:trains.length,
    _reqs:reqs,_notifs:notifs,_trains:trains
  };
}
/* Gói toàn bộ dấu vết của một người thành một object — dùng cho file sao lưu */
function empSnapshot(id){
  const e=empById(id);
  const f=empFootprint(id);
  const req={};f._reqs.forEach(r=>{if(r&&r.id)req[r.id]=r;});
  const ntf={};f._notifs.forEach(n=>{if(n&&n.id)ntf[n.id]=n;});
  return {
    app:'LPGT-CongCa', kind:'employee-backup', ver:'9.7',
    at:new Date().toISOString(), id,
    employee:e?JSON.parse(JSON.stringify(e)):null,
    base:S.base[id]||{}, over:S.over[id]||{},
    account:(S.accounts||{})[id]||null,
    requests:req, notifs:ntf,
    trainings:f._trains.map(x=>({id:x.id,title:x.title,days:x.days}))
  };
}
/* Tải file sao lưu về máy. Trả tên file, hoặc '' nếu trình duyệt không cho. */
function empBackup(id){
  try{
    const e=empById(id);
    const data=JSON.stringify(empSnapshot(id),null,2);
    const safe=noAccent((e&&e.name)||id).replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
    const fn='backup-'+(safe||'nv')+'-'+id+'-'+todayIso()+'.json';
    const a=document.createElement('a');
    a.href=URL.createObjectURL(new Blob([data],{type:'application/json'}));
    a.download=fn;document.body.appendChild(a);a.click();
    setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},2000);
    return fn;
  }catch(err){console.warn('[backup]',err);return '';}
}
/* Xoá sạch. KHÔNG hỏi, KHÔNG sao lưu — nơi gọi lo hai việc đó.
   Trả về footprint đã xoá để nơi gọi báo lại cho người dùng. */
function empPurge(id){
  const f=empFootprint(id);
  /* THỨ TỰ QUAN TRỌNG: huỷ đơn TRƯỚC khi xoá ô lịch. `cancelReq` gọi
     `revertReqSchedule` để trả ca cho người đổi ca cùng — nó GHI vào
     S.over. Xoá map trước rồi mới huỷ đơn thì lệnh ghi ấy dựng lại một
     map rỗng mang tên người vừa xoá, và người đổi ca cùng thì mất ca. */
  f._reqs.forEach(r=>{
    if(!r||!r.id)return;
    if(typeof cancelReq==='function'){try{cancelReq(r.id,false);return;}catch(err){}}
    delete S.requests[r.id];
  });
  S.employees=S.employees.filter(x=>x.id!==id);
  delete S.base[id];delete S.over[id];
  if(S.accounts)delete S.accounts[id];
  /* Thông báo: đi qua notifDrop để tin đã nằm trong hàng đợi Zalo cũng được
     rút — nếu không, người đã bị xoá vẫn nhận tin nhắn. */
  if(typeof notifDrop==='function')
    notifDrop(n=>n&&(n.to===id||n.by===id||n.from===id||n.empId===id));
  else f._notifs.forEach(n=>{if(n&&n.id)delete S.notifs[n.id];});
  /* Buổi đào tạo: chỉ gỡ TÊN khỏi danh sách dự, giữ nguyên buổi học. */
  f._trains.forEach(x=>{x.emps=x.emps.filter(k=>k!==id);
    if(x.done&&x.done[id])delete x.done[id];});
  save();
  return f;
}
/* Nút ✕ ở bảng Tài khoản. Màn Ca chuẩn dùng stdRemove() (js/28-stdshift.js)
   — cùng một đường, chỉ khác lời hỏi. */
function delEmp(id){
  if(!hrGuard())return;
  if(typeof stdRemove==='function'){stdRemove(id);return;}
  const e=empById(id);if(!e)return;
  if(!confirm(t('Xóa "')+(e.name||id)+t('" khỏi danh sách?')))return;
  empBackup(id);empPurge(id);
  renderSetup();renderBoth();
}
