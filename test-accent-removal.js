// Test script for Vietnamese accent removal
function removeVietnameseAccents(str) {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

// Test cases
const testNames = [
  { lastName: 'Nguyễn', middleName: 'Văn', firstName: 'Hùng' },
  { lastName: 'Trần', middleName: 'Thị', firstName: 'Lan' },
  { lastName: 'Lê', middleName: 'Đức', firstName: 'Anh' },
  { lastName: 'Phạm', middleName: 'Minh', firstName: 'Tuấn' },
];

console.log('Testing Vietnamese accent removal:');
testNames.forEach((name, index) => {
  const originalUsername = `${name.lastName.toLowerCase()}${name.middleName.toLowerCase()}${name.firstName.toLowerCase()}${index + 1}`;
  const cleanedUsername = `${removeVietnameseAccents(name.lastName.toLowerCase())}${removeVietnameseAccents(name.middleName.toLowerCase())}${removeVietnameseAccents(name.firstName.toLowerCase())}${index + 1}`;
  const email = `${cleanedUsername}@company.com`;

  console.log(`\nEmployee ${index + 1}:`);
  console.log(`  Original: ${originalUsername}`);
  console.log(`  Cleaned:  ${cleanedUsername}`);
  console.log(`  Email:    ${email}`);
});
