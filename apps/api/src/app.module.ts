import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ProfilesModule } from './profile/profile.module';
import { GithubAnalysisModule } from './github-analysis/github-analysis.module';



@Module({
  imports: [AuthModule, ProfilesModule, GithubAnalysisModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
