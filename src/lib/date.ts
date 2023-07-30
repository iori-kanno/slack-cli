export const convertToSimpleDate = (created: number | undefined) => {
  if (!created) return '';
  const date = new Date(created * 1000);
  return (
    `${date.getFullYear()}/` +
    `${date.getMonth() + 1}`.padStart(2, '0') +
    '/' +
    `${date.getDate()}`.padStart(2, '0')
  );
};

export const getCurrentDateString = (descriptor: string = '-') => {
  const date = new Date();
  return (
    `${date.getFullYear()}` +
    `${descriptor}` +
    `${date.getMonth() + 1}`.padStart(2, '0') +
    `${descriptor}` +
    `${date.getDate()}`.padStart(2, '0')
  );
};
