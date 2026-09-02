-- Beri user dev hak membuat database (dibutuhkan shadow DB utk `prisma migrate dev`)
GRANT ALL PRIVILEGES ON *.* TO 'ruvana'@'%' WITH GRANT OPTION;
FLUSH PRIVILEGES;
