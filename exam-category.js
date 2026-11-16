function decorateExamStudentCategories() {
  if (page !== 'exams' || !caGroup || caIndividual) return;

  const content = document.querySelector('#content');
  const classIntro = content?.querySelector('.ca-intro');
  if (!classIntro) return;

  classIntro.insertAdjacentHTML('afterend', studentCategoryControls());
  const studentsById = new Map(db.students.map(student => [String(student.id), student]));
  for (const nameButton of content.querySelectorAll('.ca-table tbody th[scope="row"] > .ca-name[data-ca-profile]')) {
    const student = studentsById.get(nameButton.dataset.caProfile);
    if (!student) continue;
    const badge = studentCategoryBadge(student);
    if (!badge) continue;

    const cell = nameButton.parentElement;
    cell.classList.add('student-category-target');
    cell.dataset.studentCategory = String(studentCategoryValue(student));
    nameButton.insertAdjacentHTML('afterend', badge);
  }
}

const examCategoryPreviousBind = bind;
bind = function () {
  decorateExamStudentCategories();
  examCategoryPreviousBind();
};
render();
