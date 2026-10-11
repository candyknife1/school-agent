/** Keep Node-only startup dependencies out of the Edge instrumentation bundle. */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { register: registerNode } = await import('./instrumentation-node');
    await registerNode();
  }
}
