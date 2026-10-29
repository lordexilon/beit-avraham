function dashboardWorkbook(data,xlsx) {
  if(!data.measurement.active_cycle) throw new Error('Exportación requiere ciclo activo.');
  const workbook=xlsx.utils.book_new();
  for(const [name,rows] of Object.entries(data.exports)) xlsx.utils.book_append_sheet(workbook,xlsx.utils.json_to_sheet(rows),name);
  return workbook;
}
module.exports={dashboardWorkbook};
