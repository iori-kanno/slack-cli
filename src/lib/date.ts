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
