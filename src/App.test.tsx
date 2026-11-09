import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from './App';
import { setTodayProvider } from './lib/dates';
import { createHabit, setLeafStatus } from './lib/habits';
import { DATA_KEY, saveData } from './lib/storage';
import { SCHEMA_VERSION, type Habit } from './lib/types';

function seed(habits: Habit[]) {
  saveData({ schemaVersion: SCHEMA_VERSION, habits, settings: { language: 'en', sound: true } }, localStorage);
}
const stored = (): Habit[] => JSON.parse(localStorage.getItem(DATA_KEY)!).habits;

function startApp(today: string, hash = '') {
  setTodayProvider(today);
  window.history.replaceState(null, '', `/${hash}`);
  return render(<App />);
}

describe('Little Garden app', () => {
  it('creates a habit through the form and preview, and shows it in My Room', async () => {
    const user = userEvent.setup();
    startApp('2026-11-09');
    expect(screen.getByText('A quiet, sunny room')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /grow your first friend/i }));
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByText('Please give your habit a name.')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Habit name'), 'No coffee');
    await user.type(screen.getByLabelText('Success condition'), 'I do not drink coffee.');
    await user.click(screen.getByRole('button', { name: 'One day more' }));
    await user.click(screen.getByRole('button', { name: 'One day more' }));
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    expect(await screen.findByText('Meet your new friend')).toBeInTheDocument();
    expect(screen.getByText('9 leaves = 9 days')).toBeInTheDocument();
    expect(screen.getByText('Starts today, ends on 17 November 2026')).toBeInTheDocument();
    expect(document.querySelectorAll('[data-leaf-index][data-status="white"]')).toHaveLength(9);

    // Edit keeps the values.
    await user.click(screen.getAllByRole('button', { name: 'Edit habit' })[1]);
    expect(await screen.findByLabelText('Habit name')).toHaveValue('No coffee');
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    const previewLeaves = Array.from(document.querySelectorAll('[data-leaf-index]')).map((n) => n.outerHTML);

    await user.click(await screen.findByRole('button', { name: "Let's grow!" }));
    const tile = await screen.findByRole('button', { name: /No coffee, day 1 of 9, 0 of 9 days marked/ });
    expect(tile).toBeInTheDocument();
    expect(stored()).toHaveLength(1);
    expect(stored()[0].startDate).toBe('2026-11-09');
    // The planted plant is exactly the previewed one.
    const roomLeaves = Array.from(tile.querySelectorAll('[data-leaf-index]')).map((n) => n.outerHTML);
    expect(roomLeaves.map((h) => h.replace(/ class="[^"]*"/, ''))).toEqual(
      previewLeaves.map((h) => h.replace(/ class="[^"]*"/, '')),
    );
  });

  it('"Try another plant" grows a different kind of plant, and that one gets planted', async () => {
    const user = userEvent.setup();
    startApp('2026-11-09');
    await user.click(screen.getByRole('button', { name: /grow your first friend/i }));
    await user.type(screen.getByLabelText('Habit name'), 'Yoga');
    await user.type(screen.getByLabelText('Success condition'), 'Ten minutes of yoga.');
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    const style = () => document.querySelector('svg[data-plant-style]')!.getAttribute('data-plant-style');
    await screen.findByText('Meet your new friend');
    const seen = new Set<string | null>([style()]);
    for (let i = 0; i < 4; i++) {
      const before = style();
      await user.click(screen.getByRole('button', { name: 'Try another plant' }));
      expect(style()).not.toBe(before);
      expect(document.querySelectorAll('[data-leaf-index]')).toHaveLength(7);
      seen.add(style());
    }
    expect(seen.size).toBeGreaterThanOrEqual(3);

    const chosen = style();
    await user.click(screen.getByRole('button', { name: "Let's grow!" }));
    await screen.findByRole('button', { name: /Yoga, day 1 of 7/ });
    expect(stored()[0].plantStyle).toBe(chosen);
  });

  it('shows the brand logo only on My Room, My Garden and Settings', async () => {
    seed([createHabit({ name: 'Walk', successCondition: 'Walk', durationDays: 5 }, '2026-11-09', [], { id: 'w' })]);
    const cases: [string, boolean][] = [
      ['#/room', true],
      ['#/garden', true],
      ['#/settings', true],
      ['#/plant/w', false],
      ['#/new', false],
    ];
    for (const [hash, visible] of cases) {
      const { unmount } = startApp('2026-11-09', hash);
      const links = screen.queryAllByRole('link', { name: /Jesenika website/ });
      expect(links, hash).toHaveLength(visible ? 1 : 0);
      if (visible) {
        expect(links[0]).toHaveAttribute('href', 'https://jesenika.cz/');
        expect(links[0]).toHaveAttribute('target', '_blank');
        expect(links[0]).toHaveAttribute('rel', 'noopener noreferrer');
      }
      unmount();
    }
  });

  it('remembers the sounds setting', async () => {
    const user = userEvent.setup();
    startApp('2026-11-09', '#/settings');
    const toggle = screen.getByRole('switch', { name: /sounds/i });
    expect(toggle).toBeChecked();
    await user.click(toggle);
    expect(toggle).not.toBeChecked();
    expect(JSON.parse(localStorage.getItem(DATA_KEY)!).settings.sound).toBe(false);
  });

  it('marks yesterday, changes and clears it, and refuses future days', async () => {
    const user = userEvent.setup();
    const habit = createHabit({ name: 'Walk', successCondition: 'Walk 30 min', durationDays: 7 }, '2026-11-09', [], {
      id: 'walk',
    });
    seed([habit]);
    startApp('2026-11-11', '#/plant/walk');
    expect(screen.getByText('Day 3 of 7')).toBeInTheDocument();

    const leaf = () => document.querySelector('[data-leaf-index="1"]')!;
    fireEvent.click(leaf());
    const menu = screen.getByRole('dialog', { name: 'Day 2 · Tue 10 Nov' });
    await user.click(within(menu).getByRole('button', { name: /mark as green/i }));
    expect(leaf()).toHaveAttribute('data-status', 'green');
    expect(stored()[0].leaves[1].status).toBe('green');

    fireEvent.click(leaf());
    await user.click(screen.getByRole('button', { name: /mark as ochre/i }));
    expect(leaf()).toHaveAttribute('data-status', 'ochre');
    fireEvent.click(leaf());
    await user.click(screen.getByRole('button', { name: /clear status/i }));
    expect(leaf()).toHaveAttribute('data-status', 'white');
    expect(stored()[0].leaves[1].status).toBe('white');

    // Future leaf: date and a note, no options.
    fireEvent.click(document.querySelector('[data-leaf-index="4"]')!);
    const future = screen.getByRole('dialog', { name: 'Day 5 · Fri 13 Nov' });
    expect(within(future).getByText(/still folded/)).toBeInTheDocument();
    expect(within(future).queryByRole('button', { name: /mark as green/i })).toBeNull();
  });

  it('edits name and condition, and deletes after confirmation', async () => {
    const user = userEvent.setup();
    seed([createHabit({ name: 'Walk', successCondition: 'Walk', durationDays: 5 }, '2026-11-09', [], { id: 'w' })]);
    startApp('2026-11-09', '#/plant/w');
    await user.click(screen.getByRole('button', { name: 'Edit' }));
    const name = screen.getByLabelText('Habit name');
    await user.clear(name);
    await user.type(name, 'Evening walk');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByRole('heading', { name: 'Evening walk' })).toBeInTheDocument();
    expect(stored()[0].name).toBe('Evening walk');
    expect(stored()[0].durationDays).toBe(5);

    await user.click(screen.getByRole('button', { name: 'Delete' }));
    await user.click(screen.getByRole('button', { name: 'Delete plant' }));
    expect(stored()).toHaveLength(0);
  });

  it('shows the completion screen once on day N+1, then the plant lives read-only in My Garden', async () => {
    const user = userEvent.setup();
    let h = createHabit({ name: 'Stretch', successCondition: 'Stretch daily', durationDays: 4 }, '2026-11-01', [], {
      id: 's',
    });
    h = setLeafStatus(h, 0, 'green', '2026-11-04');
    h = setLeafStatus(h, 1, 'ochre', '2026-11-04');
    const other = createHabit({ name: 'Read', successCondition: 'Read', durationDays: 15 }, '2026-11-01', [h], {
      id: 'r',
    });
    seed([h, other]);
    startApp('2026-11-05');

    const dialog = await screen.findByRole('dialog', { name: 'A season has ended' });
    expect(within(dialog).getByText('25%')).toBeInTheDocument();
    expect(stored().find((x) => x.id === 's')!.status).toBe('completed');
    expect(stored().find((x) => x.id === 's')!.leaves.map((l) => l.status)).toEqual(['green', 'ochre', 'white', 'white']);
    expect(stored().find((x) => x.id === 'r')!.status).toBe('active');

    await user.click(within(dialog).getByRole('button', { name: 'Move to my garden' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(await screen.findByRole('heading', { name: 'My Garden' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Stretch, 25% green/ }));

    // Read-only: no leaf buttons, per-day results listed.
    expect(await screen.findByText(/can no longer change/)).toBeInTheDocument();
    expect(document.querySelectorAll('[data-leaf-index][role="button"]')).toHaveLength(0);
    expect(screen.getAllByText('Not marked')).toHaveLength(2);

    // Grow again pre-fills the form.
    await user.click(screen.getByRole('button', { name: 'Grow again' }));
    expect(await screen.findByLabelText('Habit name')).toHaveValue('Stretch');
    expect(screen.getByLabelText('Success condition')).toHaveValue('Stretch daily');
    expect(screen.getByText('4')).toBeInTheDocument();
  });

  it('shows a congratulation for an all-green plant and does not show completion twice', async () => {
    let h = createHabit({ name: 'Water', successCondition: 'Drink water', durationDays: 4 }, '2026-11-01', [], { id: 'x' });
    for (let i = 0; i < 4; i++) h = setLeafStatus(h, i, 'green', '2026-11-04');
    seed([h]);
    const { unmount } = startApp('2026-11-06');
    const dialog = await screen.findByRole('dialog', { name: 'A thriving plant' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Move to my garden' }));
    unmount();
    startApp('2026-11-07');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('notices a new day when the app returns to the foreground', async () => {
    seed([createHabit({ name: 'Walk', successCondition: 'Walk', durationDays: 4 }, '2026-11-09', [], { id: 'w' })]);
    startApp('2026-11-09', '#/plant/w');
    expect(screen.getByText('Day 1 of 4')).toBeInTheDocument();
    setTodayProvider('2026-11-11');
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(await screen.findByText('Day 3 of 4')).toBeInTheDocument();
  });

  it('reset requires typing RESET', async () => {
    const user = userEvent.setup();
    seed([createHabit({ name: 'Walk', successCondition: 'Walk', durationDays: 4 }, '2026-11-09', [])]);
    startApp('2026-11-09', '#/settings');
    await user.click(screen.getByRole('button', { name: 'Reset all data' }));
    const confirm = screen.getByRole('button', { name: 'Delete everything' });
    expect(confirm).toBeDisabled();
    await user.type(screen.getByPlaceholderText('RESET'), 'RESET');
    expect(confirm).toBeEnabled();
    await user.click(confirm);
    await waitFor(() => expect(stored()).toHaveLength(0));
  });

  it('imports a backup file after confirmation', async () => {
    const user = userEvent.setup();
    startApp('2026-11-09', '#/settings');
    const backup = createHabit({ name: 'Yoga', successCondition: 'Yoga', durationDays: 6 }, '2026-11-08', []);
    const file = new File(
      [JSON.stringify({ schemaVersion: SCHEMA_VERSION, habits: [backup], settings: { language: 'en', sound: true } })],
      'backup.json',
      { type: 'application/json' },
    );
    await user.upload(screen.getByTestId('import-input'), file);
    const dialog = await screen.findByRole('dialog', { name: 'Replace your current data?' });
    await user.click(within(dialog).getByRole('button', { name: 'Replace and import' }));
    await waitFor(() => expect(stored().map((h) => h.name)).toEqual(['Yoga']));
  });
});
