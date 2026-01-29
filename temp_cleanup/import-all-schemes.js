import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Get current directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database connection setup
const dbConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
};

// Create all manual scheme data with exact IDs
const schemeData = [
  {
    scheme_id: "7945938",
    scheme_name: "83 Village RRWS Scheme MJP RR (C 39)",
    region_name: "Amravati",
    total_villages: 30,
    functional_villages: 9,
    partial_villages: 8,
    non_functional_villages: 13,
    fully_completed_villages: 0,
    total_esr: 63,
    scheme_functional_status: "Partial",
    fully_completed_esr: 17,
    balance_esr: 46,
    flow_meters_connected: 27,
    pressure_transmitters_connected: 24,
    residual_chlorine_connected: 27,
    scheme_status: "Partial",
    agency: "M/S Tata Consultancy Services"
  },
  {
    scheme_id: "20028563",
    scheme_name: "Malpathar 28 Villages, (Reju.)",
    region_name: "Amravati",
    total_villages: 30,
    functional_villages: 2,
    partial_villages: 7,
    non_functional_villages: 21,
    fully_completed_villages: 0,
    total_esr: 62,
    scheme_functional_status: "Partial",
    fully_completed_esr: 0,
    balance_esr: 62,
    flow_meters_connected: 8,
    pressure_transmitters_connected: 10,
    residual_chlorine_connected: 0,
    scheme_status: "Partial",
    agency: "M/S Tata Consultancy Services"
  },
  {
    scheme_id: "20003791",
    scheme_name: "105 Villages RRWSS",
    region_name: "Amravati",
    total_villages: 10,
    functional_villages: 2,
    partial_villages: 5,
    non_functional_villages: 3,
    fully_completed_villages: 0,
    total_esr: 20,
    scheme_functional_status: "Partial",
    fully_completed_esr: 0,
    balance_esr: 20,
    flow_meters_connected: 66,
    pressure_transmitters_connected: 55,
    residual_chlorine_connected: 24,
    scheme_status: "Partial",
    agency: "M/S Tata Consultancy Services"
  },
  {
    scheme_id: "20028565",
    scheme_name: "Akot 84 VRRWSS Tq. Akola, Akot & Telhara Dist. Akola",
    region_name: "Amravati",
    total_villages: 74,
    functional_villages: 12,
    partial_villages: 5,
    non_functional_villages: 57,
    fully_completed_villages: 0,
    total_esr: 117,
    scheme_functional_status: "Partial",
    fully_completed_esr: 0,
    balance_esr: 117,
    flow_meters_connected: 4,
    pressure_transmitters_connected: 0,
    residual_chlorine_connected: 4,
    scheme_status: "Partial",
    agency: "M/S Tata Consultancy Services"
  },
  {
    scheme_id: "20028330",
    scheme_name: "Langhapur 50 VRRWSS Tq. Murtizapur Dist. Akola",
    region_name: "Amravati",
    total_villages: 52,
    functional_villages: 1,
    partial_villages: 0,
    non_functional_villages: 51,
    fully_completed_villages: 0,
    total_esr: 70,
    scheme_functional_status: "Partial",
    fully_completed_esr: 0,
    balance_esr: 70,
    flow_meters_connected: 1,
    pressure_transmitters_connected: 1,
    residual_chlorine_connected: 0,
    scheme_status: "Partial",
    agency: "M/S Tata Consultancy Services"
  },
  {
    scheme_id: "20030287",
    scheme_name: "Takli & 4 Villages RRWS",
    region_name: "Amravati",
    total_villages: 5,
    functional_villages: 4,
    partial_villages: 1,
    non_functional_villages: 0,
    fully_completed_villages: 0,
    total_esr: 8,
    scheme_functional_status: "Partial",
    fully_completed_esr: 0,
    balance_esr: 8,
    flow_meters_connected: 7,
    pressure_transmitters_connected: 2,
    residual_chlorine_connected: 3,
    scheme_status: "Partial",
    agency: "M/S Tata Consultancy Services"
  },
  {
    scheme_id: "20028065",
    scheme_name: "Pophali & 3 Villages RRWSS",
    region_name: "Amravati",
    total_villages: 4,
    functional_villages: 3,
    partial_villages: 1,
    non_functional_villages: 0,
    fully_completed_villages: 0,
    total_esr: 8,
    scheme_functional_status: "Partial",
    fully_completed_esr: 5,
    balance_esr: 3,
    flow_meters_connected: 7,
    pressure_transmitters_connected: 5,
    residual_chlorine_connected: 6,
    scheme_status: "Partial",
    agency: "M/S Tata Consultancy Services"
  },
  {
    scheme_id: "20021409",
    scheme_name: "Kurha & 2 Villages RRWSS",
    region_name: "Amravati",
    total_villages: 3,
    functional_villages: 2,
    partial_villages: 0,
    non_functional_villages: 1,
    fully_completed_villages: 0,
    total_esr: 4,
    scheme_functional_status: "Partial",
    fully_completed_esr: 1,
    balance_esr: 3,
    flow_meters_connected: 3,
    pressure_transmitters_connected: 1,
    residual_chlorine_connected: 3,
    scheme_status: "Partial",
    agency: "M/S Tata Consultancy Services"
  },
  {
    scheme_id: "20027978",
    scheme_name: "Dhamangaon Deshmukh & 9 Villages RRWSS",
    region_name: "Amravati",
    total_villages: 10,
    functional_villages: 8,
    partial_villages: 2,
    non_functional_villages: 0,
    fully_completed_villages: 0,
    total_esr: 17,
    scheme_functional_status: "Partial",
    fully_completed_esr: 10,
    balance_esr: 7,
    flow_meters_connected: 15,
    pressure_transmitters_connected: 8,
    residual_chlorine_connected: 13,
    scheme_status: "Partial",
    agency: "M/S Tata Consultancy Services"
  },
  {
    scheme_id: "20021406",
    scheme_name: "Padali & 5 Villages RRWSS",
    region_name: "Amravati",
    total_villages: 6,
    functional_villages: 6,
    partial_villages: 0,
    non_functional_villages: 0,
    fully_completed_villages: 0,
    total_esr: 7,
    scheme_functional_status: "Functional",
    fully_completed_esr: 7,
    balance_esr: 0,
    flow_meters_connected: 7,
    pressure_transmitters_connected: 7,
    residual_chlorine_connected: 7,
    scheme_status: "Fully-Completed",
    agency: "M/S Tata Consultancy Services"
  },
  {
    scheme_id: "20029998",
    scheme_name: "Shahanur & 9 Villages RRWS",
    region_name: "Amravati",
    total_villages: 10,
    functional_villages: 4,
    partial_villages: 3,
    non_functional_villages: 3,
    fully_completed_villages: 0,
    total_esr: 15,
    scheme_functional_status: "Partial",
    fully_completed_esr: 3,
    balance_esr: 12,
    flow_meters_connected: 6,
    pressure_transmitters_connected: 6,
    residual_chlorine_connected: 6,
    scheme_status: "Partial",
    agency: "M/S Tata Consultancy Services"
  },
  {
    scheme_id: "20039258",
    scheme_name: "Ozar-Sakore & 2 Villages",
    region_name: "Nashik",
    total_villages: 2,
    functional_villages: 1,
    partial_villages: 1,
    non_functional_villages: 0,
    fully_completed_villages: 0,
    total_esr: 6,
    scheme_functional_status: "Partial",
    fully_completed_esr: 3,
    balance_esr: 3,
    flow_meters_connected: 6,
    pressure_transmitters_connected: 5,
    residual_chlorine_connected: 7,
    scheme_status: "Partial",
    agency: "M/S Tata Consultancy Services"
  },
  {
    scheme_id: "20028193",
    scheme_name: "Retrofitting To Wadzire (Naigaon) & 4 Villages RRWSS",
    region_name: "Nashik",
    total_villages: 4,
    functional_villages: 1,
    partial_villages: 1,
    non_functional_villages: 2,
    fully_completed_villages: 0,
    total_esr: 5,
    scheme_functional_status: "Partial",
    fully_completed_esr: 0,
    balance_esr: 5,
    flow_meters_connected: 2,
    pressure_transmitters_connected: 0,
    residual_chlorine_connected: 1,
    scheme_status: "Partial",
    agency: "M/S Tata Consultancy Services"
  },
  {
    scheme_id: "7937337",
    scheme_name: "Retro.Nimon and 4 villages, Tal. Sangamner",
    region_name: "Nashik",
    total_villages: 6,
    functional_villages: 2,
    partial_villages: 3,
    non_functional_villages: 1,
    fully_completed_villages: 0,
    total_esr: 19,
    scheme_functional_status: "Partial",
    fully_completed_esr: 7,
    balance_esr: 12,
    flow_meters_connected: 11,
    pressure_transmitters_connected: 7,
    residual_chlorine_connected: 7,
    scheme_status: "Partial",
    agency: "M/S Tata Consultancy Services"
  },
  {
    scheme_id: "20033242",
    scheme_name: "Retro.Talegaon Dighe and 16 villages, Tal. Sangamner",
    region_name: "Nashik",
    total_villages: 20,
    functional_villages: 3,
    partial_villages: 1,
    non_functional_villages: 16,
    fully_completed_villages: 0,
    total_esr: 50,
    scheme_functional_status: "Partial",
    fully_completed_esr: 4,
    balance_esr: 46,
    flow_meters_connected: 6,
    pressure_transmitters_connected: 4,
    residual_chlorine_connected: 6,
    scheme_status: "Partial",
    agency: "M/S Tata Consultancy Services"
  },
  {
    scheme_id: "20086730",
    scheme_name: "Retro.Chandwad and WSS 44 villages. Ta. Chandwad",
    region_name: "Nashik",
    total_villages: 58,
    functional_villages: 16,
    partial_villages: 2,
    non_functional_villages: 40,
    fully_completed_villages: 0,
    total_esr: 75,
    scheme_functional_status: "Partial",
    fully_completed_esr: 0,
    balance_esr: 75,
    flow_meters_connected: 5,
    pressure_transmitters_connected: 6,
    residual_chlorine_connected: 10,
    scheme_status: "Partial",
    agency: "M/S Tata Consultancy Services"
  },
  {
    scheme_id: "20054877",
    scheme_name: "Retro.Kelvad Bk.& 2 villages RRWSS. Ta.Rahta",
    region_name: "Nashik",
    total_villages: 3,
    functional_villages: 1,
    partial_villages: 1,
    non_functional_villages: 1,
    fully_completed_villages: 0,
    total_esr: 5,
    scheme_functional_status: "Partial",
    fully_completed_esr: 0,
    balance_esr: 5,
    flow_meters_connected: 2,
    pressure_transmitters_connected: 0,
    residual_chlorine_connected: 2,
    scheme_status: "Partial",
    agency: "M/S Tata Consultancy Services"
  },
  {
    scheme_id: "417239",
    scheme_name: "Retro Rui & Shingave R.R.W.S.S Tal Rahata",
    region_name: "Nashik",
    total_villages: 2,
    functional_villages: 1,
    partial_villages: 1,
    non_functional_villages: 0,
    fully_completed_villages: 0,
    total_esr: 7,
    scheme_functional_status: "Partial",
    fully_completed_esr: 4,
    balance_esr: 3,
    flow_meters_connected: 6,
    pressure_transmitters_connected: 4,
    residual_chlorine_connected: 5,
    scheme_status: "Fully-Completed",
    agency: "M/S Tata Consultancy Services"
  },
  {
    scheme_id: "20061165",
    scheme_name: "Paldhi (bk& Kh) RR Tal DHARANGAON",
    region_name: "Nashik",
    total_villages: 2,
    functional_villages: 1,
    partial_villages: 1,
    non_functional_villages: 0,
    fully_completed_villages: 0,
    total_esr: 6,
    scheme_functional_status: "Partial",
    fully_completed_esr: 5,
    balance_esr: 1,
    flow_meters_connected: 5,
    pressure_transmitters_connected: 5,
    residual_chlorine_connected: 5,
    scheme_status: "Partial",
    agency: "M/S Tata Consultancy Services"
  },
  {
    scheme_id: "20019176",
    scheme_name: "Retro. Bargaonpimpri & 6 VRWSS  Tal Sinnar",
    region_name: "Nashik",
    total_villages: 7,
    functional_villages: 4,
    partial_villages: 1,
    non_functional_villages: 2,
    fully_completed_villages: 0,
    total_esr: 16,
    scheme_functional_status: "Partial",
    fully_completed_esr: 5,
    balance_esr: 11,
    flow_meters_connected: 8,
    pressure_transmitters_connected: 5,
    residual_chlorine_connected: 12,
    scheme_status: "Partial",
    agency: "M/S Tata Consultancy Services"
  },
  {
    scheme_id: "20019286",
    scheme_name: "Nirhale-Fatehpur and 5 villages, Tal. Sinnar",
    region_name: "Nashik",
    total_villages: 5,
    functional_villages: 2,
    partial_villages: 1,
    non_functional_villages: 2,
    fully_completed_villages: 0,
    total_esr: 11,
    scheme_functional_status: "Partial",
    fully_completed_esr: 0,
    balance_esr: 11,
    flow_meters_connected: 8,
    pressure_transmitters_connected: 2,
    residual_chlorine_connected: 2,
    scheme_status: "Partial",
    agency: "M/S Tata Consultancy Services"
  },
  {
    scheme_id: "20030798",
    scheme_name: "Retrofitting To Yeola 38 Villages",
    region_name: "Nashik",
    total_villages: 28,
    functional_villages: 17,
    partial_villages: 0,
    non_functional_villages: 11,
    fully_completed_villages: 0,
    total_esr: 33,
    scheme_functional_status: "Partial",
    fully_completed_esr: 0,
    balance_esr: 33,
    flow_meters_connected: 9,
    pressure_transmitters_connected: 0,
    residual_chlorine_connected: 13,
    scheme_status: "Partial",
    agency: "M/S Tata Consultancy Services"
  },
  {
    scheme_id: "20053796",
    scheme_name: "Dondigar-Rohini & 15 Villages WSS",
    region_name: "Nashik",
    total_villages: 17,
    functional_villages: 1,
    partial_villages: 1,
    non_functional_villages: 15,
    fully_completed_villages: 0,
    total_esr: 35,
    scheme_functional_status: "Partial",
    fully_completed_esr: 0,
    balance_esr: 35,
    flow_meters_connected: 1,
    pressure_transmitters_connected: 2,
    residual_chlorine_connected: 1,
    scheme_status: "Partial",
    agency: "M/S Tata Consultancy Services"
  },
  {
    scheme_id: "5348540",
    scheme_name: "Retro.Sonai Karjgaon and 16 villages, Tal. Nevasa",
    region_name: "Nashik",
    total_villages: 18,
    functional_villages: 3,
    partial_villages: 11,
    non_functional_villages: 4,
    fully_completed_villages: 0,
    total_esr: 36,
    scheme_functional_status: "Partial",
    fully_completed_esr: 0,
    balance_esr: 36,
    flow_meters_connected: 13,
    pressure_transmitters_connected: 0,
    residual_chlorine_connected: 12,
    scheme_status: "Partial",
    agency: "M/S Tata Consultancy Services"
  },
  {
    scheme_id: "20036536",
    scheme_name: "Bothali & 7 Village RR WSS",
    region_name: "Nagpur",
    total_villages: 8,
    functional_villages: 8,
    partial_villages: 0,
    non_functional_villages: 0,
    fully_completed_villages: 0,
    total_esr: 8,
    scheme_functional_status: "Functional",
    fully_completed_esr: 6,
    balance_esr: 2,
    flow_meters_connected: 8,
    pressure_transmitters_connected: 6,
    residual_chlorine_connected: 8,
    scheme_status: "Fully-Completed",
    agency: "M/S Tata Consultancy Services"
  },
  {
    scheme_id: "2009882",
    scheme_name: "Ghot RRWSS",
    region_name: "Nagpur",
    total_villages: 3,
    functional_villages: 3,
    partial_villages: 0,
    non_functional_villages: 0,
    fully_completed_villages: 0,
    total_esr: 4,
    scheme_functional_status: "Functional",
    fully_completed_esr: 3,
    balance_esr: 1,
    flow_meters_connected: 4,
    pressure_transmitters_connected: 3,
    residual_chlorine_connected: 4,
    scheme_status: "Fully-Completed",
    agency: "M/S Tata Consultancy Services"
  },
  {
    scheme_id: "20050368",
    scheme_name: "Chinchala and 7 Villages RR Water Supply Scheme",
    region_name: "Nagpur",
    total_villages: 8,
    functional_villages: 1,
    partial_villages: 7,
    non_functional_villages: 0,
    fully_completed_villages: 0,
    total_esr: 17,
    scheme_functional_status: "Partial",
    fully_completed_esr: 2,
    balance_esr: 15,
    flow_meters_connected: 9,
    pressure_transmitters_connected: 2,
    residual_chlorine_connected: 8,
    scheme_status: "Partial",
    agency: "M/S Tata Consultancy Services"
  },
  {
    scheme_id: "20036500",
    scheme_name: "Vyahad & 2 Village RR WSS",
    region_name: "Nagpur",
    total_villages: 3,
    functional_villages: 2,
    partial_villages: 1,
    non_functional_villages: 0,
    fully_completed_villages: 0,
    total_esr: 5,
    scheme_functional_status: "Partial",
    fully_completed_esr: 1,
    balance_esr: 4,
    flow_meters_connected: 4,
    pressure_transmitters_connected: 1,
    residual_chlorine_connected: 4,
    scheme_status: "Partial",
    agency: "M/S Tata Consultancy Services"
  },
  {
    scheme_id: "7891298",
    scheme_name: "Pipri Meghe and 13 villages RR WSS",
    region_name: "Nagpur",
    total_villages: 13,
    functional_villages: 6,
    partial_villages: 4,
    non_functional_villages: 3,
    fully_completed_villages: 0,
    total_esr: 23,
    scheme_functional_status: "Partial",
    fully_completed_esr: 11,
    balance_esr: 12,
    flow_meters_connected: 14,
    pressure_transmitters_connected: 7,
    residual_chlorine_connected: 13,
    scheme_status: "Partial",
    agency: "M/S Tata Consultancy Services"
  },
  {
    scheme_id: "7928270",
    scheme_name: "Pomnbhurna Grid & 15 Villages RR Retrofitting",
    region_name: "Nagpur",
    total_villages: 15,
    functional_villages: 9,
    partial_villages: 2,
    non_functional_villages: 4,
    fully_completed_villages: 0,
    total_esr: 17,
    scheme_functional_status: "Partial",
    fully_completed_esr: 6,
    balance_esr: 11,
    flow_meters_connected: 16,
    pressure_transmitters_connected: 8,
    residual_chlorine_connected: 9,
    scheme_status: "Partial",
    agency: "M/S Tata Consultancy Services"
  },
  {
    scheme_id: "7890975",
    scheme_name: "Allapalli-Nagapalli RR",
    region_name: "Nagpur",
    total_villages: 2,
    functional_villages: 2,
    partial_villages: 0,
    non_functional_villages: 0,
    fully_completed_villages: 0,
    total_esr: 5,
    scheme_functional_status: "Partial",
    fully_completed_esr: 4,
    balance_esr: 1,
    flow_meters_connected: 5,
    pressure_transmitters_connected: 4,
    residual_chlorine_connected: 4,
    scheme_status: "Partial",
    agency: "M/S Tata Consultancy Services"
  },
  {
    scheme_id: "20019216",
    scheme_name: "GOREGAON RR Retrofitting",
    region_name: "Nagpur",
    total_villages: 1,
    functional_villages: 1,
    partial_villages: 0,
    non_functional_villages: 0,
    fully_completed_villages: 0,
    total_esr: 1,
    scheme_functional_status: "Functional",
    fully_completed_esr: 1,
    balance_esr: 0,
    flow_meters_connected: 1,
    pressure_transmitters_connected: 1,
    residual_chlorine_connected: 0,
    scheme_status: "Fully-Completed",
    agency: "M/S Tata Consultancy Services"
  },
  {
    scheme_id: "7890965",
    scheme_name: "Mul Grid & 24 Villages  RR WSS Retrofitting",
    region_name: "Nagpur",
    total_villages: 24,
    functional_villages: 8,
    partial_villages: 5,
    non_functional_villages: 11,
    fully_completed_villages: 0,
    total_esr: 49,
    scheme_functional_status: "Partial",
    fully_completed_esr: 17,
    balance_esr: 32,
    flow_meters_connected: 25,
    pressure_transmitters_connected: 15,
    residual_chlorine_connected: 20,
    scheme_status: "Partial",
    agency: "M/S Tata Consultancy Services"
  },
  {
    scheme_id: "20009650",
    scheme_name: "Waddhmna WSS",
    region_name: "Nagpur",
    total_villages: 1,
    functional_villages: 0,
    partial_villages: 1,
    non_functional_villages: 0,
    fully_completed_villages: 0,
    total_esr: 2,
    scheme_functional_status: "Partial",
    fully_completed_esr: 2,
    balance_esr: 0,
    flow_meters_connected: 2,
    pressure_transmitters_connected: 2,
    residual_chlorine_connected: 1,
    scheme_status: "Partial",
    agency: "M/S Tata Consultancy Services"
  },
  {
    scheme_id: "2003645",
    scheme_name: "Kudwa-Katangikala Peri Urban RR",
    region_name: "Nagpur",
    total_villages: 2,
    functional_villages: 2,
    partial_villages: 0,
    non_functional_villages: 0,
    fully_completed_villages: 0,
    total_esr: 3,
    scheme_functional_status: "Functional",
    fully_completed_esr: 2,
    balance_esr: 1,
    flow_meters_connected: 3,
    pressure_transmitters_connected: 2,
    residual_chlorine_connected: 3,
    scheme_status: "Fully-Completed",
    agency: "M/S Tata Consultancy Services"
  },
  {
    scheme_id: "631010",
    scheme_name: "Gobarwahi RR Retrofitting",
    region_name: "Nagpur",
    total_villages: 1,
    functional_villages: 1,
    partial_villages: 0,
    non_functional_villages: 0,
    fully_completed_villages: 0,
    total_esr: 2,
    scheme_functional_status: "Functional",
    fully_completed_esr: 2,
    balance_esr: 0,
    flow_meters_connected: 2,
    pressure_transmitters_connected: 2,
    residual_chlorine_connected: 2,
    scheme_status: "Fully-Completed",
    agency: "M/S Tata Consultancy Services"
  },
  {
    scheme_id: "20017217",
    scheme_name: "Dewadi RR WSS",
    region_name: "Nagpur",
    total_villages: 1,
    functional_villages: 1,
    partial_villages: 0,
    non_functional_villages: 0,
    fully_completed_villages: 0,
    total_esr: 2,
    scheme_functional_status: "Functional",
    fully_completed_esr: 0,
    balance_esr: 2,
    flow_meters_connected: 1,
    pressure_transmitters_connected: 0,
    residual_chlorine_connected: 0,
    scheme_status: "Fully-Completed",
    agency: "M/S Tata Consultancy Services"
  },
  {
    scheme_id: "7940695",
    scheme_name: "Bidgaon Tarodi wss",
    region_name: "Nagpur",
    total_villages: 1,
    functional_villages: 1,
    partial_villages: 0,
    non_functional_villages: 0,
    fully_completed_villages: 0,
    total_esr: 3,
    scheme_functional_status: "Functional",
    fully_completed_esr: 3,
    balance_esr: 0,
    flow_meters_connected: 3,
    pressure_transmitters_connected: 3,
    residual_chlorine_connected: 3,
    scheme_status: "Fully-Completed",
    agency: "M/S Tata Consultancy Services"
  },
  {
    scheme_id: "20036862",
    scheme_name: "Bor Chandli 5 Village RR WSS",
    region_name: "Nagpur",
    total_villages: 5,
    functional_villages: 1,
    partial_villages: 4,
    non_functional_villages: 0,
    fully_completed_villages: 0,
    total_esr: 7,
    scheme_functional_status: "Partial",
    fully_completed_esr: 2,
    balance_esr: 5,
    flow_meters_connected: 4,
    pressure_transmitters_connected: 3,
    residual_chlorine_connected: 4,
    scheme_status: "Partial",
    agency: "M/S Tata Consultancy Services"
  },
  {
    scheme_id: "20047934",
    scheme_name: "Bilvale water supply sheme, Tal Khalapur",
    region_name: "Konkan",
    total_villages: 1,
    functional_villages: 1,
    partial_villages: 0,
    non_functional_villages: 0,
    fully_completed_villages: 0,
    total_esr: 3,
    scheme_functional_status: "Partial",
    fully_completed_esr: 0,
    balance_esr: 3,
    flow_meters_connected: 1,
    pressure_transmitters_connected: 0,
    residual_chlorine_connected: 1,
    scheme_status: "Partial",
    agency: "M/S Tata Consultancy Services"
  },
  {
    scheme_id: "4917484",
    scheme_name: "Devnhave water supply scheme",
    region_name: "Konkan",
    total_villages: 1,
    functional_villages: 1,
    partial_villages: 0,
    non_functional_villages: 0,
    fully_completed_villages: 0,
    total_esr: 2,
    scheme_functional_status: "Partial",
    fully_completed_esr: 0,
    balance_esr: 2,
    flow_meters_connected: 2,
    pressure_transmitters_connected: 1,
    residual_chlorine_connected: 2,
    scheme_status: "Partial",
    agency: "M/S Tata Consultancy Services"
  },
  {
    scheme_id: "2000929",
    scheme_name: "Shahapada 38 Villages",
    region_name: "Konkan",
    total_villages: 5,
    functional_villages: 0,
    partial_villages: 5,
    non_functional_villages: 0,
    fully_completed_villages: 0,
    total_esr: 8,
    scheme_functional_status: "Partial",
    fully_completed_esr: 0,
    balance_esr: 8,
    flow_meters_connected: 5,
    pressure_transmitters_connected: 1,
    residual_chlorine_connected: 4,
    scheme_status: "Partial",
    agency: "M/S Tata Consultancy Services"
  },
  {
    scheme_id: "20085424",
    scheme_name: "Modgaon & Tornipada RWSS",
    region_name: "Konkan",
    total_villages: 4,
    functional_villages: 4,
    partial_villages: 0,
    non_functional_villages: 0,
    fully_completed_villages: 0,
    total_esr: 4,
    scheme_functional_status: "Partial",
    fully_completed_esr: 0,
    balance_esr: 4,
    flow_meters_connected: 3,
    pressure_transmitters_connected: 1,
    residual_chlorine_connected: 3,
    scheme_status: "Partial",
    agency: "M/S Tata Consultancy Services"
  },
  {
    scheme_id: "20067458",
    scheme_name: "Retrofiting of Gotheghar Dahisar R.R. Water Supply Scheme",
    region_name: "Konkan",
    total_villages: 1,
    functional_villages: 1,
    partial_villages: 0,
    non_functional_villages: 0,
    fully_completed_villages: 0,
    total_esr: 2,
    scheme_functional_status: "Partial",
    fully_completed_esr: 0,
    balance_esr: 2,
    flow_meters_connected: 1,
    pressure_transmitters_connected: 0,
    residual_chlorine_connected: 0,
    scheme_status: "Partial",
    agency: "M/S Tata Consultancy Services"
  },
  {
    scheme_id: "20057414",
    scheme_name: "Petdwadgaon & 4 village WSS",
    region_name: "Chhatrapati Sambhajinagar",
    total_villages: 5,
    functional_villages: 3,
    partial_villages: 2,
    non_functional_villages: 0,
    fully_completed_villages: 0,
    total_esr: 6,
    scheme_functional_status: "Partial",
    fully_completed_esr: 0,
    balance_esr: 6,
    flow_meters_connected: 6,
    pressure_transmitters_connected: 0,
    residual_chlorine_connected: 6,
    scheme_status: "Partial",
    agency: "M/S Tata Consultancy Services"
  },
  {
    scheme_id: "20027984",
    scheme_name: "Harangul and Hayatnagar 9 VV Village Grid WSS",
    region_name: "Chhatrapati Sambhajinagar",
    total_villages: 9,
    functional_villages: 5,
    partial_villages: 4,
    non_functional_villages: 0,
    fully_completed_villages: 0,
    total_esr: 16,
    scheme_functional_status: "Partial",
    fully_completed_esr: 0,
    balance_esr: 16,
    flow_meters_connected: 10,
    pressure_transmitters_connected: 0,
    residual_chlorine_connected: 7,
    scheme_status: "Partial",
    agency: "M/S Tata Consultancy Services"
  },
  {
    scheme_id: "20027979",
    scheme_name: "Akluz & 4 Villages, Tal Daund",
    region_name: "Pune",
    total_villages: 5,
    functional_villages: 2,
    partial_villages: 3,
    non_functional_villages: 0,
    fully_completed_villages: 0,
    total_esr: 7,
    scheme_functional_status: "Partial",
    fully_completed_esr: 0,
    balance_esr: 7,
    flow_meters_connected: 3,
    pressure_transmitters_connected: 0,
    residual_chlorine_connected: 2,
    scheme_status: "Partial",
    agency: "M/S Tata Consultancy Services"
  }
];

// Import data to database
async function importSchemesToDatabase() {
  const pool = new pg.Pool(dbConfig);
  
  try {
    console.log(`Importing ${schemeData.length} schemes to database...`);
    
    // Clear existing schemes
    await pool.query('DELETE FROM scheme_status');
    console.log('Cleared existing schemes from database');
    
    // Create a single prepared statement for better performance
    const insertStmt = `
      INSERT INTO scheme_status (
        scheme_id, scheme_name, region_name, total_villages, functional_villages,
        partial_villages, non_functional_villages, fully_completed_villages,
        total_esr, scheme_functional_status, fully_completed_esr, balance_esr,
        flow_meters_connected, pressure_transmitters_connected, residual_chlorine_connected,
        scheme_status, agency
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
      )
    `;
    
    // Process each scheme
    for (const scheme of schemeData) {
      try {
        await pool.query(insertStmt, [
          scheme.scheme_id, scheme.scheme_name, scheme.region_name,
          scheme.total_villages, scheme.functional_villages,
          scheme.partial_villages, scheme.non_functional_villages,
          scheme.fully_completed_villages, scheme.total_esr,
          scheme.scheme_functional_status, scheme.fully_completed_esr,
          scheme.balance_esr, scheme.flow_meters_connected,
          scheme.pressure_transmitters_connected, scheme.residual_chlorine_connected,
          scheme.scheme_status, scheme.agency
        ]);
        console.log(`Imported scheme: ${scheme.scheme_id} - ${scheme.scheme_name}`);
      } catch (error) {
        console.error(`Error importing scheme ${scheme.scheme_id}:`, error);
      }
    }
    
    // Update region summaries
    await updateRegionSummaries(pool);
    
    console.log('All schemes imported successfully!');
    return true;
  } catch (error) {
    console.error('Error importing schemes to database:', error);
    return false;
  } finally {
    await pool.end();
  }
}

// Update region summaries
async function updateRegionSummaries(pool) {
  console.log("Updating region summaries...");
  
  try {
    // Get all the regions
    const regionsResult = await pool.query('SELECT region_name FROM region');
    const regions = regionsResult.rows.map(row => row.region_name);
    
    for (const region of regions) {
      // Calculate totals from scheme_status table
      const totalsResult = await pool.query(`
        SELECT 
          COUNT(*) as total_schemes_integrated,
          SUM(CASE WHEN scheme_status = 'Fully-Completed' THEN 1 ELSE 0 END) as fully_completed_schemes,
          SUM(total_villages) as total_villages_integrated,
          SUM(fully_completed_villages) as fully_completed_villages,
          SUM(total_esr) as total_esr_integrated,
          SUM(fully_completed_esr) as fully_completed_esr,
          SUM(total_esr - fully_completed_esr) as partial_esr,
          SUM(flow_meters_connected) as flow_meter_integrated,
          SUM(residual_chlorine_connected) as rca_integrated,
          SUM(pressure_transmitters_connected) as pressure_transmitter_integrated
        FROM scheme_status
        WHERE region_name = $1
      `, [region]);
      
      if (totalsResult.rows.length > 0) {
        const totals = totalsResult.rows[0];
        
        // Update the region record
        await pool.query(`
          UPDATE region SET
            total_schemes_integrated = $1,
            fully_completed_schemes = $2,
            total_villages_integrated = $3,
            fully_completed_villages = $4,
            total_esr_integrated = $5,
            fully_completed_esr = $6,
            partial_esr = $7,
            flow_meter_integrated = $8,
            rca_integrated = $9,
            pressure_transmitter_integrated = $10
          WHERE region_name = $11
        `, [
          totals.total_schemes_integrated || 0,
          totals.fully_completed_schemes || 0,
          totals.total_villages_integrated || 0,
          totals.fully_completed_villages || 0,
          totals.total_esr_integrated || 0,
          totals.fully_completed_esr || 0,
          totals.partial_esr || 0,
          totals.flow_meter_integrated || 0,
          totals.rca_integrated || 0,
          totals.pressure_transmitter_integrated || 0,
          region
        ]);
        
        console.log(`Updated summary data for region: ${region}`);
      }
    }
    
    console.log("All region summaries updated successfully");
  } catch (error) {
    console.error("Error updating region summaries:", error);
  }
}

// Main function
async function main() {
  try {
    // Import data to database
    const success = await importSchemesToDatabase();
    
    if (success) {
      console.log("Data import completed successfully");
      process.exit(0);
    } else {
      console.error("Data import failed");
      process.exit(1);
    }
  } catch (error) {
    console.error("Unhandled error:", error);
    process.exit(1);
  }
}

// Run the main function
main();