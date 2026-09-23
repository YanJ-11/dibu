/* Local PDF export for player-authored notes and immutable saved copies.
   The same page images are displayed and embedded into a genuine multi-page PDF. */
window.DibuPDF = (() => {
  'use strict';
  const encoder = new TextEncoder();
  const bytes = value => encoder.encode(value);
  function imagePDF(images) {
    const parts = [], offsets = [0]; let length = 0;
    function append(value) { const part = typeof value === 'string' ? bytes(value) : value; parts.push(part); length += part.length; }
    function object(number,body) { offsets[number]=length; append(`${number} 0 obj\n`);append(body);append('\nendobj\n'); }
    append('%PDF-1.4\n% locally generated document\n');
    object(1,'<< /Type /Catalog /Pages 2 0 R >>');
    object(2,`<< /Type /Pages /Count ${images.length} /Kids [${images.map((_,i)=>`${3+i*3} 0 R`).join(' ')}] >>`);
    images.forEach((image,index) => {
      const page=3+index*3, stream=page+1, picture=page+2;
      object(page,`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /XObject << /Im0 ${picture} 0 R >> >> /Contents ${stream} 0 R >>`);
      const drawing='q\n595.28 0 0 841.89 0 0 cm\n/Im0 Do\nQ';
      object(stream,`<< /Length ${bytes(drawing).length} >>\nstream\n${drawing}\nendstream`);
      const binary=Uint8Array.from(atob(image.split(',')[1]),c=>c.charCodeAt(0));
      offsets[picture]=length;append(`${picture} 0 obj\n<< /Type /XObject /Subtype /Image /Width 1240 /Height 1754 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${binary.length} >>\nstream\n`);
      append(binary);append('\nendstream\nendobj\n');
    });
    const xref=length, count=3+images.length*3;
    append(`xref\n0 ${count}\n0000000000 65535 f \n`);
    for(let i=1;i<count;i++)append(`${String(offsets[i]).padStart(10,'0')} 00000 n \n`);
    append(`trailer\n<< /Size ${count} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
    return new Blob(parts,{type:'application/pdf'});
  }
  async function fromText(file) {
    await document.fonts.ready;
    const canvas=document.createElement('canvas');canvas.width=1240;canvas.height=1754;
    const ctx=canvas.getContext('2d');ctx.font='26px "Microsoft YaHei", sans-serif';
    const lines=[];
    for(const paragraph of String(file.text||'').split(/\r?\n/)) {
      if(!paragraph){lines.push('');continue;}
      let line='';
      for(const ch of paragraph){if(ctx.measureText(line+ch).width>1040&&line){lines.push(line);line='';}line+=ch;}
      lines.push(line);
    }
    const title=String(file.name||'留存副本').replace(/\.(txt|pdf)$/i,'');
    const pages=[],perPage=29,total=Math.max(1,Math.ceil(lines.length/perPage));
    for(let page=0;page<total;page++){
      ctx.fillStyle='#fff';ctx.fillRect(0,0,1240,1754);
      ctx.fillStyle='#657580';ctx.font='23px "Microsoft YaHei", sans-serif';ctx.fillText('陈言 / 下载与留存',100,100);
      ctx.strokeStyle='#d5dfe4';ctx.beginPath();ctx.moveTo(100,127);ctx.lineTo(1140,127);ctx.stroke();
      let titleSize=36;
      do{ctx.font=`${titleSize}px "Microsoft YaHei", sans-serif`;if(ctx.measureText(title).width<=1040)break;titleSize-=1;}while(titleSize>18);
      ctx.fillStyle='#1c384b';ctx.fillText(title,100,193);
      ctx.fillStyle='#73808a';ctx.font='20px "Microsoft YaHei", sans-serif';ctx.fillText(`本地留存日期：${file.date||'2026/09/22 09:24'}`,100,237);
      ctx.fillStyle='#283843';ctx.font='26px "Microsoft YaHei", sans-serif';
      lines.slice(page*perPage,(page+1)*perPage).forEach((line,i)=>ctx.fillText(line,100,309+i*43));
      ctx.strokeStyle='#d5dfe4';ctx.beginPath();ctx.moveTo(100,1648);ctx.lineTo(1140,1648);ctx.stroke();
      ctx.fillStyle='#73808a';ctx.font='19px "Microsoft YaHei", sans-serif';ctx.fillText('原样留存 / 私人文件',100,1690);ctx.fillText(`${page+1} / ${total}`,1070,1690);
      pages.push(canvas.toDataURL('image/jpeg',.92));
    }
    const blob=imagePDF(pages);
    return {pdf:URL.createObjectURL(blob),pages,size:`${Math.ceil(blob.size/1024)} KB`,text:file.text,temporary:true};
  }
  return {fromText};
})();
