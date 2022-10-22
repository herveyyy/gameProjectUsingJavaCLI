package Trash;


import Main.Player;
public class MageSkillSystem {
    private int n = 4;
   public String skillName;
   public float effect;
   protected float skillDamage;
   public  float minusMana = 1.5f;
   public String[] skills = new String[4];
   
  public float skillFireball(){
         this.skillName = "FireBall";
    this.effect = 1f;//burning effect in 3rounds
    this.minusMana = (int) (skillDamage * minusMana);
   this.skillDamage = 5f; 
        return skillDamage;
    }

    public float skillCompressedWind(){
          this.skillName = "CompressedWind";
    this.skillDamage = 7f;
    this.minusMana = (int) (skillDamage * minusMana);
        return skillDamage;
    
    }
   
    public float skillWaterSplash(){
            this.skillName = "WaterSplash";
    this.skillDamage = 3f;
    this.minusMana = (int) (skillDamage * minusMana);
    return 3f;
    
    }
    public void chooseSkill(int choice){
   
    
    if(skills[choice] == skills[1]){  
    skillFireball();
    System.out.println("You used: "+skillName+"\n"+"Damage: "+ skillDamage );
    }else if(skills[choice] == skills[2]){  
     skillCompressedWind();
    System.out.println("You used: "+skillName+"\n"+"Damage: "+ skillDamage );
    }else if(skills[choice] == skills[3]){  
     skillWaterSplash();
    System.out.println("You used: "+skillName+"\n"+"Damage: "+ skillDamage );
    
    }
    }
    public void currentSkills(){
       skillFireball();
       this.skills[1] =  skillName;
       skillCompressedWind();
       this.skills[2] =  skillName;
       skillWaterSplash();
       this.skills[3] = skillName;
       
    }
   
}
