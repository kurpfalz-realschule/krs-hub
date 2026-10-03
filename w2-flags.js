// W2-00: visibility only; database/RPC authorization is independently required.
(function (root) {
  'use strict';
  const keys = { UNTERRICHT: 'unterricht', HAUSAUFGABEN: 'hausaufgaben', BBB: 'bbb' };
  let flags = Object.create(null);
  let generation = 0;
  const changed = () => root.dispatchEvent(new Event('krs-w2-flags-changed'));
  root.KRSW2Flags = {
    enabled(key) {
      return flags[key] === true && root.KRS_TENANT?.features?.[keys[key]] !== false;
    },
    reset() {
      generation += 1;
      const wasEnabled = Object.values(flags).some(Boolean);
      flags = Object.create(null);
      if (wasEnabled) changed();
    },
    async refresh(client) {
      const request = ++generation;
      let next = Object.create(null);
      try {
        const { data, error } = await client.from('school_features').select('key,enabled');
        if (!error && Array.isArray(data)) {
          for (const row of data) if (Object.hasOwn(keys, row.key)) next[row.key] = row.enabled === true;
        }
      } catch { /* Missing table, offline, or denied access: closed. */ }
      if (request !== generation) return;
      flags = next;
      changed();
    }
  };
})(window);
