export async function entryOverview(friendbooks, orders, page = 0) {
  const [result, allOrders] = await Promise.all([friendbooks.list(page), (async () => {
    const values = [];
    let current = 0;
    let batch;
    do {
      batch = await orders.list(current++);
      values.push(...batch.orders);
    } while (batch.hasMore);
    return values;
  })()]);
  return {...result, entries:result.entries.map(entry => {
    const linked = allOrders.filter(order => order.friendbookId === entry.id);
    return {...entry, orders:linked, progress:linked.length ? "Bestellung abgeschlossen" : "Freundesbuch abgeschlossen"};
  })};
}
