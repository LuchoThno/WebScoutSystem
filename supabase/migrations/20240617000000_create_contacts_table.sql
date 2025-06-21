-- Migration to create contacts table for contact form messages
create table if not exists contacts (
  id uuid primary key default gen_random_uuid(),
  name varchar(255) not null,
  email varchar(255) not null,
  phone varchar(50) not null,
  message text not null,
  date timestamp with time zone default now(),
  status varchar(20) default 'pending'
);
