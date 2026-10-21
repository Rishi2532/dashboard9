import { getEscalationStatus } from '../server/services/escalation-service';

async function main() {
  const res = await getEscalationStatus();
  console.log('Today Dispatches:', res.summary.dispatches.today);
  console.log('Last 7 days Dispatches:', res.summary.dispatches.last_7_days);
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
