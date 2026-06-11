import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type Client = SupabaseClient<Database>;

export class AuthService {
  constructor(private readonly db: Client) {}

  async getUser(): Promise<User | null> {
    const {
      data: { user },
      error,
    } = await this.db.auth.getUser();

    if (error) return null;
    return user;
  }

  async requireUser(): Promise<User> {
    const user = await this.getUser();
    if (!user) throw new Error("Unauthorized");
    return user;
  }

  async signUp(email: string, password: string, fullName: string) {
    const { data, error } = await this.db.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
      },
    });

    if (error) throw new Error(error.message);
    return data;
  }

  async signIn(email: string, password: string) {
    const { data, error } = await this.db.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw new Error(error.message);
    return data;
  }

  async signOut() {
    const { error } = await this.db.auth.signOut();
    if (error) throw new Error(error.message);
  }
}
